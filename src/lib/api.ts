export interface ApiUser {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
  avatar_url?: string;
  role?: string;
  locale?: "en" | "fr";
  location?: Record<string, string>;
  verified?: boolean;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiSession { user: ApiUser; access_token: string }
type AuthEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED";
type AuthListener = (event: AuthEvent, session: ApiSession | null) => void;

const API_URL = import.meta.env.VITE_API_URL || "/api";
const listeners = new Set<AuthListener>();

export function apiMediaUrl(path: string) {
  const resolvedPath = path.startsWith('/api/') ? path.slice(4) : path;
  return `${API_URL}${resolvedPath}`;
}

function token() { return localStorage.getItem("crimex_token"); }
function storeToken(value?: string) {
  if (value) localStorage.setItem("crimex_token", value);
  else localStorage.removeItem("crimex_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set("Content-Type", "application/json");
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `Request failed (${response.status})`), { status: response.status, body });
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function apiBlob(path: string): Promise<Blob> {
  const headers = new Headers();
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(apiMediaUrl(path), { headers, credentials: "include" });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  return response.blob();
}

export async function createEmergencyRecordingStream(input: { recordingSessionId: string; type: string; location?: { latitude: number; longitude: number; accuracy?: number } }) {
  const created = await apiFetch<{ emergency: { id: string; reference: string }; recoveryCode?: string }>('/emergencies', { method: 'POST', body: JSON.stringify({ recordingSessionId: input.recordingSessionId, type: input.type, ...(input.location || {}) }) });
  const apiBase = API_URL.startsWith('http') ? new URL(API_URL) : new URL(API_URL, window.location.origin);
  apiBase.protocol = apiBase.protocol === 'https:' ? 'wss:' : 'ws:';
  apiBase.pathname = `${apiBase.pathname.replace(/\/$/, '')}/emergencies/${encodeURIComponent(input.recordingSessionId)}/stream-socket`;
  const socket = new WebSocket(apiBase);
  socket.binaryType = 'arraybuffer';
  let settled = false;
  let resolveReady: () => void;
  let rejectReady: (reason: Error) => void;
  const ready = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  let resolveCompleted: (value: { received: boolean; size: number; sessionId: string }) => void;
  let rejectCompleted: (reason: Error) => void;
  const completed = new Promise<{ received: boolean; size: number; sessionId: string }>((resolve, reject) => { resolveCompleted = resolve; rejectCompleted = reject; });
  socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'authenticate', token: token(), recoveryCode: created.recoveryCode, mimeType: 'video/webm' })));
  socket.addEventListener('message', event => {
    if (typeof event.data !== 'string') return;
    const response = JSON.parse(event.data);
    if (response.type === 'ready') resolveReady();
    if (response.type === 'completed') { settled = true; resolveCompleted(response); }
    if (response.type === 'error') { const error = new Error(response.error || 'Recording stream failed'); rejectReady(error); if (!settled) { settled = true; rejectCompleted(error); } }
  });
  socket.addEventListener('error', () => { const error = new Error('Recording stream connection failed'); rejectReady(error); if (!settled) { settled = true; rejectCompleted(error); } });
  socket.addEventListener('close', event => { if (!settled) { settled = true; rejectCompleted(new Error(event.reason || 'Recording stream closed before completion')); } });

  const waitForCapacity = async () => {
    while (socket.bufferedAmount > 1024 * 1024) await new Promise(resolve => setTimeout(resolve, 25));
  };
  const writer = {
    async write(bytes: Uint8Array) { await ready; await waitForCapacity(); if (socket.readyState !== WebSocket.OPEN) throw new Error('Recording stream is not open'); socket.send(bytes); },
    async close() { await ready; await waitForCapacity(); socket.send(JSON.stringify({ type: 'complete' })); },
    async abort(reason?: unknown) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'abort', reason: String(reason || '') })); socket.close(1000, 'Recording cancelled'); },
  };
  void completed.catch(() => undefined);
  await ready;
  return { emergency: created.emergency, recoveryCode: created.recoveryCode, writer, completed };
}

const auth = {
  async getSession() {
    if (!token()) return { data: { session: null }, error: null };
    try {
      const data = await apiFetch<{ user: ApiUser }>("/auth/me");
      return { data: { session: { user: data.user, access_token: token()! } }, error: null };
    } catch (error) {
      storeToken();
      return { data: { session: null }, error };
    }
  },
  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify(email.trim().startsWith('+') ? { phone: email, password } : { email, password }) });
      storeToken(data.token);
      const session = { user: data.user, access_token: data.token };
      listeners.forEach(listener => listener("SIGNED_IN", session));
      return { data: { session, user: data.user }, error: null };
    } catch (error) { return { data: { session: null, user: null }, error }; }
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string; locale?: string } } }) {
    try {
      const identifier = email.trim();
      const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/register", { method: "POST", body: JSON.stringify({ ...(identifier.startsWith('+') ? { phone: identifier } : { email: identifier }), password, fullName: options?.data?.full_name, locale: options?.data?.locale }) });
      storeToken(data.token);
      const session = { user: data.user, access_token: data.token };
      listeners.forEach(listener => listener("SIGNED_IN", session));
      return { data: { session, user: data.user }, error: null };
    } catch (error) { return { data: { session: null, user: null }, error }; }
  },
  async signOut() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    storeToken();
    listeners.forEach(listener => listener("SIGNED_OUT", null));
    return { error: null };
  },
  async requestOtp(phone: string) {
    try { return { data: await apiFetch<{ sent: boolean; expiresInSeconds: number; developmentCode?: string }>("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) }), error: null }; }
    catch (error) { return { data: null, error: error as Error }; }
  },
  async verifyOtp(phone: string, code: string, fullName?: string) {
    try {
      const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code, fullName, locale: localStorage.getItem('crimex_locale') || 'fr' }) });
      storeToken(data.token);
      const session = { user: data.user, access_token: data.token };
      listeners.forEach(listener => listener("SIGNED_IN", session));
      return { data, error: null };
    } catch (error) { return { data: null, error: error as Error }; }
  },
};

type Operation = "select" | "insert" | "update" | "delete";
class QueryBuilder implements PromiseLike<{ data: unknown; error: Error | null }> {
  private operation: Operation = "select";
  private payload: unknown;
  private filters: Record<string, unknown> = {};
  private inFilters: Record<string, unknown[]> = {};
  private sort?: { field: string; ascending: boolean };
  private wantSingle = false;
  constructor(private table: string) {}
  select(_fields = "*") { return this; }
  insert(payload: unknown) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: unknown) { this.operation = "update"; this.payload = payload; return this; }
  delete() { this.operation = "delete"; return this; }
  eq(field: string, value: unknown) { this.filters[field] = value; return this; }
  in(field: string, values: unknown[]) { this.inFilters[field] = values; return this; }
  order(field: string, opts: { ascending?: boolean } = {}) { this.sort = { field, ascending: opts.ascending ?? true }; return this; }
  single() { this.wantSingle = true; return this; }
  maybeSingle() { this.wantSingle = true; return this; }
  then<TResult1 = { data: unknown; error: Error | null }, TResult2 = never>(onfulfilled?: ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    return this.execute().then(onfulfilled, onrejected);
  }
  private endpoint() {
    return this.table === "profiles" ? "/users" : this.table === "emergency_logs" ? "/emergencies" : `/${this.table}`;
  }
  private normalizePayload(value: Record<string, unknown>) {
    if (this.table === "reports") return { ...value, category: value.crime_type, addressText: value.location, isAnonymous: value.is_anonymous, latitude: (value.coordinates as Record<string, number>)?.latitude, longitude: (value.coordinates as Record<string, number>)?.longitude };
    if (this.table === "notifications") return { ...value, title: { en: value.title, fr: value.title }, message: { en: value.message, fr: value.message }, targetUser: value.target_user_id };
    if (this.table === "profiles") return { ...value, fullName: value.full_name, avatarUrl: value.avatar_url, jurisdiction: typeof value.location === "string" ? { town: value.location } : value.location };
    return value;
  }
  private async execute() {
    try {
      const id = String(this.filters.id || this.filters.user_id || "");
      let path = this.endpoint();
      let method = "GET";
      let body: string | undefined;
      if (this.operation === "insert") {
        method = "POST";
        body = JSON.stringify(this.normalizePayload((Array.isArray(this.payload) ? this.payload[0] : this.payload) as Record<string, unknown>));
      } else if (this.operation === "update") {
        method = "PATCH";
        const value = this.normalizePayload(this.payload as Record<string, unknown>);
        if (this.table === "reports") { path = `/reports/${id}/status`; body = JSON.stringify({ ...value, status: value.status === "pending" ? "received" : value.status === "in_progress" ? "assigned" : value.status }); }
        else if (this.table === "emergency_logs") { path = `/emergencies/${id}/status`; body = JSON.stringify(value); }
        else if (this.table === "notifications") { path = `/notifications/${id}/read`; body = JSON.stringify(value); }
        else if (this.table === "profiles" && id) { path = `/users/${id}`; body = JSON.stringify(value); }
        else if (this.table === "profiles") { path = "/profile"; body = JSON.stringify(value); }
        else { path = `${path}/${id}`; body = JSON.stringify(value); }
      } else if (this.operation === "delete") {
        method = "DELETE";
        path = `${path}/${id}`;
      } else {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(this.filters)) if (!["id", "user_id"].includes(key)) query.set(key === "crime_type" ? "category" : key, String(value));
        path += query.size ? `?${query}` : "";
      }
      let data = await apiFetch<unknown>(path, { method, body });
      if (this.table === "profiles" && !Array.isArray(data) && (data as { profile?: unknown })?.profile) data = (data as { profile: unknown }).profile;
      if (this.table === "reports" && !Array.isArray(data) && (data as { report?: unknown })?.report) data = (data as { report: unknown }).report;
      if (Array.isArray(data) && Object.keys(this.inFilters).length) data = data.filter(item => Object.entries(this.inFilters).every(([field, values]) => values.map(String).includes(String((item as Record<string, unknown>)[field]))));
      if (Array.isArray(data) && this.sort) data.sort((a, b) => { const av = (a as Record<string, unknown>)[this.sort!.field]; const bv = (b as Record<string, unknown>)[this.sort!.field]; return (String(av).localeCompare(String(bv))) * (this.sort!.ascending ? 1 : -1); });
      if (this.wantSingle && Array.isArray(data)) data = data[0] || null;
      return { data, error: null };
    } catch (error) { return { data: null, error: error as Error }; }
  }
}

export const api = {
  auth,
  from(table: string) { return new QueryBuilder(table); },
  channel() {
    const channel = { on: () => channel, subscribe: () => channel };
    return channel;
  },
  removeChannel() { return Promise.resolve(); },
};

export async function getCommunityPosts() {
  return apiFetch<unknown[]>('/community/posts');
}
export async function createCommunityPost(content: string, _authorId: string, category: string | null) {
  try { return { data: await apiFetch('/community/posts', { method: 'POST', body: JSON.stringify({ content, category, title: 'Community update' }) }), error: null }; }
  catch (error) { return { data: null, error: error as Error }; }
}
export async function getCommentsForPost(postId: string) {
  return apiFetch<unknown[]>(`/community/posts/${postId}/comments`);
}
export async function createComment(postId: string, _authorId: string, content: string) {
  try { return { data: await apiFetch(`/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }), error: null }; }
  catch (error) { return { data: null, error: error as Error }; }
}

export default api;
