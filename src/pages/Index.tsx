import { Link } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, Eye, FileText, Heart, Lock, MapPin, MessageCircle, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReportPopup } from "@/components/reports/ReportPopup";
import { useReportPopup } from "@/hooks/useReportPopup";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { loading } = useAuth();
  const { locale } = useLanguage();
  const fr = locale === "fr";
  const { isReportOpen, openReportPopup, closeReportPopup, handleReportSubmit } = useReportPopup();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" aria-label={fr ? "Chargement" : "Loading"} /></div>;

  const features = [
    { icon: FileText, title: fr ? "Signalement simple" : "Simple reporting", description: fr ? "Décrivez un incident et joignez des preuves privées depuis votre téléphone." : "Describe an incident and attach private evidence from your phone." },
    { icon: MapPin, title: fr ? "Carte respectueuse de la vie privée" : "Privacy-aware map", description: fr ? "Consultez uniquement les incidents non sensibles, résolus et localisés approximativement." : "See only non-sensitive, resolved incidents with approximate locations." },
    { icon: Eye, title: fr ? "Anonymat au choix" : "Optional anonymity", description: fr ? "Signalez sans compte et suivez le dossier avec une référence confidentielle." : "Report without an account and follow the case with a private reference." },
    { icon: Lock, title: fr ? "Preuves protégées" : "Protected evidence", description: fr ? "Les photos, vidéos et audios ne sont jamais affichés sur la carte publique." : "Photos, video and audio are never shown on the public map." },
    { icon: Heart, title: fr ? "Orientation VBG" : "GBV referral", description: fr ? "Un parcours protégé pour les violences basées sur le genre et l'orientation vers un partenaire habilité." : "A protected path for gender-based violence and referral to an approved partner." },
    { icon: MessageCircle, title: fr ? "Français et anglais" : "French and English", description: fr ? "Les parcours essentiels sont disponibles dans les deux langues officielles." : "Essential journeys are available in both official languages." },
  ];

  const steps = [
    { icon: FileText, number: "01", title: fr ? "Signalez" : "Report", text: fr ? "Choisissez l'anonymat, décrivez le lieu avec un quartier ou un repère, puis ajoutez les preuves utiles." : "Choose anonymity, describe the place with a neighbourhood or landmark, then add useful evidence." },
    { icon: Shield, number: "02", title: fr ? "Traitement" : "Triage", text: fr ? "Un opérateur autorisé vérifie et oriente le dossier vers un partenaire configuré pour la zone." : "An authorized operator reviews and routes the case to a partner configured for the area." },
    { icon: CheckCircle2, number: "03", title: fr ? "Suivez" : "Track", text: fr ? "Consultez l'évolution avec votre référence sans exposer publiquement vos informations sensibles." : "Follow progress with your reference without publicly exposing sensitive information." },
  ];

  return <div className="min-h-screen bg-background">
    <Header />
    <main>
      <section className="border-b bg-[#f4efdf]">
        <div className="container mx-auto grid gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-primary"><span className="h-1 w-10 bg-primary" />{fr ? "UNE PLATEFORME PENSÉE POUR LE CAMEROUN" : "BUILT FOR COMMUNITIES IN CAMEROON"}</div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">{fr ? "Signaler. Orienter. Protéger nos communautés." : "Report. Refer. Protect our communities."}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{fr ? "CrimeX facilite le signalement d'incidents, même hors connexion, avec un suivi confidentiel, des repères locaux et les numéros d'urgence officiels." : "CrimeX makes incident reporting easier, even offline, with confidential tracking, local landmarks and official emergency numbers."}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" onClick={openReportPopup} className="min-h-12 px-7"><FileText />{fr ? "Signaler un incident" : "Report an incident"}</Button><Button asChild size="lg" variant="outline" className="min-h-12 border-primary bg-transparent px-7 text-primary hover:bg-primary/5"><Link to="/track"><MapPin />{fr ? "Suivre un signalement" : "Track a report"}</Link></Button></div>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4 text-primary" />{fr ? "Le signalement est gratuit. Aucun paiement n'est demandé." : "Reporting is free. No payment is required."}</p>
          </div>
          <aside className="border border-primary/20 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 grid grid-cols-3" aria-hidden="true"><span className="h-2 bg-[#007a5e]" /><span className="h-2 bg-[#c7352d]" /><span className="h-2 bg-[#f2c230]" /></div>
            <Badge className="mb-4 bg-secondary text-secondary-foreground hover:bg-secondary">{fr ? "Couverture nationale" : "National coverage"}</Badge>
            <h2 className="text-2xl font-bold">{fr ? "Adapté aux réalités locales" : "Designed around local realities"}</h2>
            <ul className="mt-6 space-y-5">
              <li className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><strong>{fr ? "10 régions et 58 départements" : "10 regions and 58 divisions"}</strong><small className="mt-1 block text-muted-foreground">{fr ? "Quartiers, villages, carrefours et points de repère." : "Neighbourhoods, villages, junctions and landmarks."}</small></span></li>
              <li className="flex gap-3"><MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><strong>{fr ? "Accès bilingue" : "Bilingual access"}</strong><small className="mt-1 block text-muted-foreground">Français · English</small></span></li>
              <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><span><strong>{fr ? "Numéros officiels visibles" : "Official numbers always visible"}</strong><small className="mt-1 block text-muted-foreground">Police 117 · Gendarmerie 113 · Pompiers 118 · SAMU 119</small></span></li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-b bg-white py-8"><div className="container mx-auto grid grid-cols-2 gap-6 px-4 text-center md:grid-cols-4">{[
        ["EN / FR", fr ? "Accès bilingue" : "Bilingual access"], ["10", fr ? "Régions couvertes" : "Regions covered"], ["58", fr ? "Départements" : "Divisions"], [fr ? "Privé" : "Private", fr ? "Preuves sensibles" : "Sensitive evidence"],
      ].map(([value, label]) => <div key={label} className="border-l-2 border-secondary px-3"><p className="text-2xl font-bold text-primary">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>)}</div></section>

      <section id="features" className="py-16 md:py-20"><div className="container mx-auto px-4"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-wider text-primary">Services</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">{fr ? "L'essentiel pour signaler en confiance" : "The essentials for reporting with confidence"}</h2><p className="mt-4 text-lg text-muted-foreground">{fr ? "Des outils sobres, compréhensibles et adaptés aux connexions mobiles." : "Clear, understandable tools adapted to mobile connections."}</p></div><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{features.map(feature => <Card key={feature.title} className="shadow-none transition-colors hover:border-primary/40"><CardHeader><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10"><feature.icon className="h-5 w-5 text-primary" /></div><CardTitle className="text-xl">{feature.title}</CardTitle></CardHeader><CardContent><CardDescription className="text-base leading-7">{feature.description}</CardDescription></CardContent></Card>)}</div></div></section>

      <section id="how-it-works" className="border-y bg-white py-16 md:py-20"><div className="container mx-auto px-4"><div className="text-center"><p className="text-sm font-bold uppercase tracking-wider text-primary">{fr ? "Parcours" : "Process"}</p><h2 className="mt-3 text-3xl font-bold md:text-4xl">{fr ? "Trois étapes claires" : "Three clear steps"}</h2></div><div className="mt-12 grid gap-8 md:grid-cols-3">{steps.map(step => <article key={step.number} className="border-t-4 border-primary pt-6"><div className="flex items-center justify-between"><step.icon className="h-7 w-7 text-primary" /><span className="text-3xl font-bold text-secondary">{step.number}</span></div><h3 className="mt-5 text-2xl font-bold">{step.title}</h3><p className="mt-3 leading-7 text-muted-foreground">{step.text}</p></article>)}</div></div></section>

      <section id="emergency" className="py-16 md:py-20"><div className="container mx-auto grid gap-10 px-4 lg:grid-cols-2 lg:items-center"><div><Badge variant="destructive">{fr ? "En cas d'urgence" : "In an emergency"}</Badge><h2 className="mt-4 text-3xl font-bold md:text-4xl">{fr ? "Appelez d'abord le service approprié" : "Call the appropriate service first"}</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">{fr ? "CrimeX peut enregistrer une alerte, la position autorisée et une vidéo privée. Une alerte enregistrée ne signifie pas qu'un service officiel l'a reçue." : "CrimeX can record an alert, permitted location and private video. A saved alert does not mean an official service has received it."}</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="flex gap-3"><Camera className="h-6 w-6 text-destructive" /><span><strong>{fr ? "Flux vidéo continu" : "Continuous video stream"}</strong><small className="mt-1 block text-muted-foreground">{fr ? "Démarrage et arrêt contrôlés par vous." : "You control when it starts and stops."}</small></span></div><div className="flex gap-3"><MapPin className="h-6 w-6 text-destructive" /><span><strong>{fr ? "Position avec consentement" : "Location by consent"}</strong><small className="mt-1 block text-muted-foreground">{fr ? "Uniquement après autorisation." : "Only after permission."}</small></span></div></div></div><div className="border-l-4 border-destructive bg-white p-7 shadow-sm"><AlertTriangle className="h-10 w-10 text-destructive" /><h3 className="mt-4 text-2xl font-bold">{fr ? "Danger immédiat ?" : "Immediate danger?"}</h3><p className="mt-2 text-muted-foreground">{fr ? "Contactez directement les services d'urgence du Cameroun." : "Contact Cameroon emergency services directly."}</p><div className="mt-6 grid grid-cols-2 gap-3"><Button asChild variant="destructive"><a href="tel:117"><Phone />Police 117</a></Button><Button asChild variant="outline"><a href="tel:113">Gendarmerie 113</a></Button><Button asChild variant="outline"><a href="tel:118">Pompiers 118</a></Button><Button asChild variant="outline"><a href="tel:119">SAMU 119</a></Button></div></div></div></section>

      <section className="bg-primary py-14 text-primary-foreground"><div className="container mx-auto flex flex-col items-start justify-between gap-7 px-4 md:flex-row md:items-center"><div><p className="text-sm font-semibold uppercase tracking-wider text-secondary">{fr ? "Sécurité communautaire" : "Community safety"}</p><h2 className="mt-2 text-3xl font-bold">{fr ? "Un incident à signaler ?" : "Need to report an incident?"}</h2><p className="mt-2 max-w-xl text-primary-foreground/80">{fr ? "Commencez sans compte ou connectez-vous pour retrouver tous vos dossiers." : "Start without an account or sign in to keep all your cases together."}</p></div><div className="flex flex-wrap gap-3"><Button size="lg" variant="secondary" onClick={openReportPopup}>{fr ? "Faire un signalement" : "Make a report"}</Button><Button asChild size="lg" className="border border-primary-foreground/40 bg-transparent hover:bg-white/10"><Link to="/map"><MapPin />{fr ? "Voir la carte" : "View the map"}</Link></Button></div></div></section>
    </main>
    <Footer />
    <ReportPopup isOpen={isReportOpen} onClose={closeReportPopup} onSubmit={handleReportSubmit} />
  </div>;
};

export default Index;
