import { Link } from 'react-router-dom';
import { Shield, MapPin, Phone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer = () => {
  const { locale } = useLanguage();
  const fr = locale === 'fr';
  return <footer className="bg-slate-950 text-slate-200">
    <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-3">
      <div><div className="mb-3 flex items-center gap-2 text-xl font-bold text-white"><Shield className="h-6 w-6 text-primary" /> CrimeX</div><p className="max-w-sm text-sm text-slate-400">{fr ? 'Une plateforme camerounaise de signalement, d’orientation et de sécurité communautaire. La transmission aux services dépend des partenaires connectés.' : 'A Cameroon-focused reporting, referral and community-safety platform. Delivery to services depends on connected partners.'}</p></div>
      <div><h3 className="mb-3 font-semibold text-white">{fr ? 'Accès rapide' : 'Quick access'}</h3><nav className="grid gap-2 text-sm text-slate-400"><Link className="hover:text-white" to="/track">{fr ? 'Suivre un signalement' : 'Track a report'}</Link><Link className="hover:text-white" to="/map">{fr ? 'Carte des incidents' : 'Incident map'}</Link><Link className="hover:text-white" to="/partners">{fr ? 'Partenaires vérifiés' : 'Verified partners'}</Link><Link className="hover:text-white" to="/support">{fr ? 'Soutenir la plateforme' : 'Support the platform'}</Link></nav></div>
      <div><h3 className="mb-3 font-semibold text-white">{fr ? 'Urgences au Cameroun' : 'Cameroon emergency lines'}</h3><div className="space-y-3 text-sm text-slate-400"><p className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" /> Police 117 · Gendarmerie 113 · Pompiers/Fire 118 · SAMU 119</p><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary" /> Yaoundé, Cameroun</p><p>{fr ? 'En danger immédiat, appelez directement le service approprié.' : 'If danger is immediate, call the appropriate service directly.'}</p></div></div>
    </div>
    <div className="border-t border-slate-800 px-4 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} CrimeX. {fr ? 'Le signalement est gratuit.' : 'Incident reporting is free.'}</div>
  </footer>;
};

export default Footer;
