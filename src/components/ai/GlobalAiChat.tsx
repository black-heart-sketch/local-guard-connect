import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, Loader2, MessageCircle, Send, ShieldAlert, Sparkles, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { chatWithAssistant, type AiChatMessage } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

const copy = {
  en: {
    button: "Ask CrimeX AI", title: "CrimeX safety assistant", description: "General safety and CrimeX guidance for Cameroon",
    welcome: "Hello! I can help you use CrimeX, prepare an incident report, preserve evidence, or find general safety guidance in Cameroon.",
    warning: "AI cannot contact emergency services. In immediate danger call Police 117, Gendarmerie 113, Fire 118, or SAMU 119.",
    privacy: "Do not share passwords, payment details, ID numbers, or an exact private address.", placeholder: "Ask a safety question…",
    send: "Send message", clear: "Clear conversation", thinking: "Preparing a response…", error: "I could not answer right now. Please try again.",
    publicAccess: "Public data", roleAccess: "Role-aware access",
    suggestions: ["How do I report anonymously?", "How should I preserve evidence?", "What are Cameroon emergency numbers?"],
    citizenSuggestions: ["What is the status of my reports?", "Show my recent notifications"],
    operatorSuggestions: ["Summarize the cases I can access", "What needs attention in my permitted scope?"],
  },
  fr: {
    button: "Demander à l’IA CrimeX", title: "Assistant sécurité CrimeX", description: "Conseils généraux de sécurité et aide CrimeX au Cameroun",
    welcome: "Bonjour ! Je peux vous aider à utiliser CrimeX, préparer un signalement, préserver des preuves ou obtenir des conseils généraux de sécurité au Cameroun.",
    warning: "L’IA ne peut pas contacter les secours. En cas de danger immédiat : Police 117, Gendarmerie 113, Pompiers 118 ou SAMU 119.",
    privacy: "Ne partagez pas de mot de passe, données de paiement, numéro de CNI ou adresse privée exacte.", placeholder: "Posez une question de sécurité…",
    send: "Envoyer", clear: "Effacer la conversation", thinking: "Préparation de la réponse…", error: "Je ne peux pas répondre maintenant. Veuillez réessayer.",
    publicAccess: "Données publiques", roleAccess: "Accès selon le rôle",
    suggestions: ["Comment signaler anonymement ?", "Comment préserver les preuves ?", "Quels sont les numéros d’urgence ?"],
    citizenSuggestions: ["Quel est le statut de mes signalements ?", "Affiche mes notifications récentes"],
    operatorSuggestions: ["Résume les dossiers auxquels j’ai accès", "Que faut-il traiter dans mon périmètre autorisé ?"],
  },
} as const;

function newSessionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? `crimex-${crypto.randomUUID()}` : `crimex-${Date.now()}`;
}

export default function GlobalAiChat({ besideEmergency }: { besideEmergency: boolean }) {
  const { locale } = useLanguage();
  const { profile } = useAuth();
  const text = copy[locale];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [access, setAccess] = useState<{ authenticated: boolean; role: string } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const visibleMessages = useMemo<AiChatMessage[]>(() => [{ role: "assistant", content: text.welcome }, ...messages], [messages, text.welcome]);
  const suggestions = profile ? (profile.role === "citizen" ? text.citizenSuggestions : text.operatorSuggestions) : text.suggestions;
  const displayedAccess = access?.authenticated ? access.role : profile?.role;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (content: string) => {
    const clean = content.trim();
    if (!clean || loading) return;
    const nextMessages: AiChatMessage[] = [...messages, { role: "user", content: clean }].slice(-11);
    setMessages(nextMessages); setInput(""); setError(""); setLoading(true);
    try {
      const result = await chatWithAssistant({ messages: nextMessages, locale, sessionId });
      setAccess(result.access);
      setMessages(current => [...current, { role: "assistant", content: result.reply }].slice(-12));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : text.error);
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void send(input); };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(input); }
  };
  const clear = () => { setMessages([]); setInput(""); setError(""); setAccess(null); setSessionId(newSessionId()); };

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <Button
        className="fixed z-40 h-16 w-16 rounded-full border-4 border-white bg-emerald-700 p-0 text-white shadow-2xl hover:bg-emerald-800"
        style={{ bottom: "calc(2rem + env(safe-area-inset-bottom))", right: besideEmergency ? "calc(7.25rem + env(safe-area-inset-right))" : "calc(1.5rem + env(safe-area-inset-right))" }}
        aria-label={text.button}
        title={text.button}
      >
        <span className="flex flex-col items-center leading-none"><MessageCircle className="h-6 w-6" /><span className="mt-1 text-[10px] font-bold">AI</span></span>
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader className="border-b bg-emerald-800 px-5 py-5 pr-12 text-left text-white">
        <SheetTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5" />{text.title}</SheetTitle>
        <SheetDescription className="text-emerald-50">{text.description}</SheetDescription>
        <span className="w-fit rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">{displayedAccess ? `${text.roleAccess}: ${displayedAccess}` : text.publicAccess}</span>
      </SheetHeader>

      <div className="border-b bg-amber-50 px-4 py-3 text-xs text-amber-950">
        <p className="flex gap-2 font-medium"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />{text.warning}</p>
        <p className="mt-1 pl-6 text-amber-800">{text.privacy}</p>
      </div>

      <ScrollArea className="min-h-0 flex-1 bg-slate-50">
        <div className="space-y-4 p-4" aria-live="polite">
          {visibleMessages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Bot className="h-4 w-4" /></span>}
            <div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${message.role === "user" ? "rounded-br-sm bg-emerald-800 text-white" : "rounded-bl-sm border bg-white text-slate-800"}`}>{message.content}</div>
            {message.role === "user" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"><UserRound className="h-4 w-4" /></span>}
          </div>)}
          {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-emerald-700" />{text.thinking}</div>}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {!messages.length && <div className="flex flex-wrap gap-2 border-t bg-white px-4 py-3">{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => void send(suggestion)} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-left text-xs text-emerald-900 hover:bg-emerald-100">{suggestion}</button>)}</div>}

      <form onSubmit={submit} className="border-t bg-white p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-end gap-2">
          <Textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={handleKeyDown} maxLength={2000} rows={2} disabled={loading} placeholder={text.placeholder} className="min-h-[52px] resize-none" />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-[52px] w-[52px] shrink-0 bg-emerald-700 hover:bg-emerald-800" aria-label={text.send}><Send className="h-5 w-5" /></Button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{input.length}/2000</span><button type="button" onClick={clear} disabled={loading || (!messages.length && !input)} className="flex items-center gap-1 hover:text-red-700 disabled:opacity-40"><Trash2 className="h-3 w-3" />{text.clear}</button></div>
      </form>
    </SheetContent>
  </Sheet>;
}
