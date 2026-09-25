import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2, MapPin, Phone, ShieldCheck } from 'lucide-react';

interface Agency { id: string; name: string; type: string; verified: boolean; phones: string[]; jurisdiction?: { region?: string; council?: string; town?: string } }

export default function PartnersPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const { locale } = useLanguage();
  const fr = locale === 'fr';
  useEffect(() => { apiFetch<Agency[]>('/agencies').then(setAgencies).finally(() => setLoading(false)); }, []);
  return <div className="min-h-screen bg-background"><Header /><main className="container mx-auto px-4 py-10"><div className="mb-8"><h1 className="text-3xl font-bold">{fr ? 'Partenaires de sécurité vérifiés' : 'Verified safety partners'}</h1><p className="text-muted-foreground">{fr ? 'Services, communes, ONG et organisations communautaires approuvés au Cameroun.' : 'Approved agencies, councils, NGOs, and community organizations serving Cameroon.'}</p></div>{loading ? <p>{fr ? 'Chargement…' : 'Loading…'}</p> : agencies.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">{fr ? 'Aucun partenaire vérifié n’est encore publié pour votre zone.' : 'No verified partner has been published for your area yet.'}</CardContent></Card> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{agencies.map(agency => <Card key={agency.id}><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{agency.name}<ShieldCheck className="h-4 w-4 text-green-600" /></CardTitle><Badge className="w-fit capitalize">{agency.type}</Badge></CardHeader><CardContent className="space-y-2 text-sm">{agency.jurisdiction && <p className="flex gap-2"><MapPin className="h-4 w-4" />{[agency.jurisdiction.town, agency.jurisdiction.council, agency.jurisdiction.region].filter(Boolean).join(', ')}</p>}{agency.phones.map(phone => <a key={phone} className="flex gap-2 text-primary" href={`tel:${phone}`}><Phone className="h-4 w-4" />{phone}</a>)}</CardContent></Card>)}</div>}</main><Footer /></div>;
}
