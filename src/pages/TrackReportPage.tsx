import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

type TimelineItem = { status: string; note?: string; createdAt?: string };
type TrackedReport = { reference: string; category: string; status: string; createdAt: string; timeline?: TimelineItem[] };
type SavedReceipt = { reference: string; recoveryCode: string; syncedAt: string };

export default function TrackReportPage() {
  const { locale } = useLanguage();
  const [reference, setReference] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [report, setReport] = useState<TrackedReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const fr = locale === 'fr';
  useEffect(() => {
    const load = () => setReceipts(JSON.parse(localStorage.getItem('crimex_report_receipts') || '[]'));
    load(); window.addEventListener('crimex:report-sent', load); return () => window.removeEventListener('crimex:report-sent', load);
  }, []);

  async function track() {
    setLoading(true); setError(''); setReport(null);
    try {
      const result = await apiFetch<TrackedReport>(`/reports/track/${encodeURIComponent(reference.trim())}`, { headers: { 'x-recovery-code': recoveryCode.trim() } });
      setReport(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (fr ? 'Impossible de retrouver le signalement.' : 'Unable to find the report.'));
    } finally { setLoading(false); }
  }

  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto max-w-2xl space-y-6 px-4 py-10">{receipts.length > 0 && <Card><CardHeader><CardTitle>{fr ? 'Signalements synchronisés sur cet appareil' : 'Reports synchronized on this device'}</CardTitle></CardHeader><CardContent className="space-y-2">{receipts.map(receipt => <Button key={receipt.reference} variant="outline" className="w-full justify-between" onClick={() => { setReference(receipt.reference); setRecoveryCode(receipt.recoveryCode); }}><span>{receipt.reference}</span><span>{fr ? 'Utiliser' : 'Use'}</span></Button>)}</CardContent></Card>}<Card><CardHeader><CardTitle>{fr ? 'Suivre un signalement anonyme' : 'Track an anonymous report'}</CardTitle><CardDescription>{fr ? 'Utilisez la référence et le code de récupération remis lors du signalement.' : 'Use the reference and recovery code provided when you submitted the report.'}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label>{fr ? 'Référence' : 'Reference'}</Label><Input placeholder="CMR-2026-XXXXXXXX" value={reference} onChange={event => setReference(event.target.value)} /></div><div className="space-y-2"><Label>{fr ? 'Code de récupération' : 'Recovery code'}</Label><Input type="password" autoComplete="off" value={recoveryCode} onChange={event => setRecoveryCode(event.target.value)} /></div><Button onClick={track} disabled={loading || !reference.trim() || !recoveryCode.trim()} className="w-full">{loading ? (fr ? 'Recherche…' : 'Checking…') : (fr ? 'Voir le statut' : 'View status')}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}{report && <div className="rounded-lg border p-4 space-y-3"><div className="flex items-center justify-between gap-3"><strong>{report.reference}</strong><Badge>{report.status.replaceAll('_', ' ')}</Badge></div><p className="text-sm text-muted-foreground">{report.category}</p><ol className="space-y-2 border-l pl-4">{report.timeline?.map((item, index) => <li key={`${item.status}-${index}`} className="text-sm"><span className="font-medium">{item.status.replaceAll('_', ' ')}</span>{item.note ? ` — ${item.note}` : ''}</li>)}</ol></div>}</CardContent></Card></main><Footer /></div>;
}
