import { apiFetch } from './api';

export interface QueuedReport {
  id: string;
  createdAt: string;
  report: {
    crimeType: string;
    location: string;
    description: string;
    files: File[];
    isAnonymous: boolean;
    coordinates?: { latitude: number; longitude: number };
    jurisdiction?: { region?: string; division?: string; subdivision?: string; council?: string; quarter?: string; landmark?: string };
    sensitive?: boolean;
    contactPreference?: string;
    safeContactTime?: string;
    recoveryCode?: string;
  };
}

const DB_NAME = 'crimex-offline';
const STORE = 'reports';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueReport(report: QueuedReport['report']) {
  const db = await database();
  const recoveryCode = report.isAnonymous ? (report.recoveryCode || Array.from(crypto.getRandomValues(new Uint8Array(18)), value => (value % 36).toString(36)).join('').toUpperCase()) : undefined;
  const item: QueuedReport = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), report: { ...report, recoveryCode } };
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  return { id: item.id, recoveryCode };
}

async function queuedReports(): Promise<QueuedReport[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedReport(id: string) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function reportFormData(report: QueuedReport['report'], clientSubmissionId = crypto.randomUUID()) {
  const body = new FormData();
  body.set('category', report.crimeType);
  body.set('addressText', report.location);
  body.set('description', report.description);
  body.set('isAnonymous', String(report.isAnonymous));
  body.set('clientSubmissionId', clientSubmissionId);
  if (report.jurisdiction) body.set('jurisdiction', JSON.stringify(report.jurisdiction));
  body.set('sensitive', String(Boolean(report.sensitive)));
  if (report.contactPreference) body.set('contactPreference', report.contactPreference);
  if (report.safeContactTime) body.set('safeContactTime', report.safeContactTime);
  if (report.recoveryCode) body.set('recoveryCode', report.recoveryCode);
  if (report.coordinates) {
    body.set('latitude', String(report.coordinates.latitude));
    body.set('longitude', String(report.coordinates.longitude));
  }
  report.files.forEach(file => body.append('files', file));
  return body;
}

export async function flushQueuedReports() {
  if (!navigator.onLine) return 0;
  let sent = 0;
  for (const item of await queuedReports()) {
    try {
      const result = await apiFetch<{ report: { reference: string }; recoveryCode?: string }>('/reports', { method: 'POST', body: reportFormData(item.report, item.id) });
      if (result.recoveryCode) {
        const receipts = JSON.parse(localStorage.getItem('crimex_report_receipts') || '[]') as Array<{ reference: string; recoveryCode: string; syncedAt: string }>;
        receipts.unshift({ reference: result.report.reference, recoveryCode: result.recoveryCode, syncedAt: new Date().toISOString() });
        localStorage.setItem('crimex_report_receipts', JSON.stringify(receipts.slice(0, 20)));
        window.dispatchEvent(new CustomEvent('crimex:report-sent'));
      }
      await removeQueuedReport(item.id);
      sent += 1;
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        await removeQueuedReport(item.id);
        sent += 1;
      } else break;
    }
  }
  return sent;
}
