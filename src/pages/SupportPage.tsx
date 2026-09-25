import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupportPage() {
  const { user, loading } = useAuth();
  const [provider, setProvider] = useState('mtn');
  const [phone, setPhone] = useState('+2376');
  const [amount, setAmount] = useState('1000');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { locale } = useLanguage();
  const fr = locale === 'fr';
  if (!loading && !user) return <Navigate to="/auth" replace />;
  const submit = async () => { setSubmitting(true); try { const payment = await apiFetch<{ reference: string; status: string; simulated: boolean }>('/payments', { method: 'POST', body: JSON.stringify({ provider, phone, amount: Number(amount), purpose: 'donation' }) }); toast({ title: fr ? 'Demande de paiement créée' : 'Payment request created', description: `${payment.reference}: ${payment.status}${payment.simulated ? (fr ? ' (simulation de développement)' : ' (development simulation)') : ''}` }); } catch (error) { toast({ title: fr ? 'Paiement indisponible' : 'Payment unavailable', description: error instanceof Error ? error.message : (fr ? 'Réessayez plus tard' : 'Try again later'), variant: 'destructive' }); } finally { setSubmitting(false); } };
  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto max-w-xl px-4 py-10"><Card><CardHeader><CardTitle>{fr ? 'Soutenir la sécurité communautaire' : 'Support community safety'}</CardTitle><CardDescription>{fr ? 'Contribution facultative par MTN MoMo ou Orange Money via DigiPay. Les signalements et urgences restent toujours gratuits.' : 'Optional MTN MoMo or Orange Money contribution through DigiPay. Incident and emergency reporting is always free.'}</CardDescription></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label>{fr ? 'Opérateur préféré' : 'Preferred provider'}</Label><Select value={provider} onValueChange={setProvider}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mtn">MTN MoMo</SelectItem><SelectItem value="orange">Orange Money</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>{fr ? 'Téléphone' : 'Phone'}</Label><Input value={phone} onChange={event => setPhone(event.target.value)} /></div><div className="space-y-2"><Label>{fr ? 'Montant (FCFA)' : 'Amount (FCFA)'}</Label><Input type="number" min="100" value={amount} onChange={event => setAmount(event.target.value)} /></div><Button className="w-full" disabled={submitting} onClick={submit}>{submitting ? (fr ? 'Demande…' : 'Requesting…') : (fr ? 'Continuer avec Mobile Money' : 'Continue with Mobile Money')}</Button></CardContent></Card></main><Footer /></div>;
}
