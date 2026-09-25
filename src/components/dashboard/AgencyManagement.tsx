import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cameroonRegions } from '@/data/cameroonLocations';

type Agency = { id: string; name: string; type: string; verified: boolean; phones: string[]; jurisdiction?: { region?: string; council?: string; town?: string } };

export function AgencyManagement() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('ngo');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Centre');
  const [council, setCouncil] = useState('');
  const { toast } = useToast();
  const load = () => apiFetch<Agency[]>('/agencies').then(setAgencies).catch(error => toast({ title: 'Could not load partners', description: error.message, variant: 'destructive' }));
  useEffect(() => { void load(); }, []);

  async function create() {
    try {
      await apiFetch('/agencies', { method: 'POST', body: JSON.stringify({ name, type, phones: phone ? [phone] : [], jurisdiction: { region, council }, verified: false }) });
      setName(''); setPhone(''); setCouncil(''); await load();
      toast({ title: 'Partner created', description: 'Verify it after checking its identity and contact details.' });
    } catch (error) { toast({ title: 'Could not create partner', description: error instanceof Error ? error.message : '', variant: 'destructive' }); }
  }

  async function toggleVerification(agency: Agency) {
    await apiFetch(`/agencies/${agency.id}`, { method: 'PATCH', body: JSON.stringify({ verified: !agency.verified }) });
    await load();
  }

  return <div className="grid gap-6 lg:grid-cols-[360px_1fr]"><Card><CardHeader><CardTitle>Add safety partner</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label>Name</Label><Input value={name} onChange={event => setName(event.target.value)} /></div><div><Label>Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['police','gendarmerie','fire','medical','ngo','council','community'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div><Label>Phone</Label><Input placeholder="+237…" value={phone} onChange={event => setPhone(event.target.value)} /></div><div><Label>Region</Label><Select value={region} onValueChange={setRegion}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{cameroonRegions.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div><Label>Council / Commune</Label><Input value={council} onChange={event => setCouncil(event.target.value)} /></div><Button className="w-full" disabled={!name.trim()} onClick={create}>Create unverified partner</Button></CardContent></Card><div className="space-y-3">{agencies.map(agency => <Card key={agency.id}><CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold">{agency.name}<Badge variant={agency.verified ? 'default' : 'secondary'}>{agency.verified ? 'Verified' : 'Unverified'}</Badge></div><p className="text-sm text-muted-foreground">{agency.type} · {[agency.jurisdiction?.council, agency.jurisdiction?.region].filter(Boolean).join(', ') || 'No jurisdiction'}</p></div><Button variant={agency.verified ? 'outline' : 'default'} onClick={() => toggleVerification(agency)}>{agency.verified ? 'Revoke verification' : 'Mark verified'}</Button></CardContent></Card>)}</div></div>;
}
