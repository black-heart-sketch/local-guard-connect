import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Locale = 'en' | 'fr';
const messages = {
  en: {
    features: 'Features', how: 'How it works', community: 'Community', emergency: 'Emergency', partners: 'Partners', trackReport: 'Track report', support: 'Support',
    signIn: 'Sign in', getStarted: 'Get started', dashboard: 'Dashboard', profile: 'Profile', logout: 'Log out',
    safetyNetwork: 'Cameroon safety network', emergencyBanner: 'Emergency: Police 117 · Gendarmerie 113 · Fire 118 · SAMU 119',
    reportTitle: 'Report an incident', reportDescription: 'Provide the incident details. Sensitive evidence remains private.',
    incidentType: 'Incident type', selectType: 'Select an incident type', location: 'Location or landmark', useLocation: 'Use my GPS location',
    description: 'Description', attachments: 'Private evidence (photo, video or audio)', submit: 'Continue', cancel: 'Cancel',
    anonymous: 'Submit anonymously', identified: 'Submit with my account', language: 'Français',
  },
  fr: {
    features: 'Fonctionnalités', how: 'Comment ça marche', community: 'Communauté', emergency: 'Urgence', partners: 'Partenaires', trackReport: 'Suivre un signalement', support: 'Soutenir',
    signIn: 'Se connecter', getStarted: 'Commencer', dashboard: 'Tableau de bord', profile: 'Profil', logout: 'Déconnexion',
    safetyNetwork: 'Réseau de sécurité du Cameroun', emergencyBanner: 'Urgence : Police 117 · Gendarmerie 113 · Pompiers 118 · SAMU 119',
    reportTitle: 'Signaler un incident', reportDescription: 'Décrivez l’incident. Les preuves sensibles restent privées.',
    incidentType: 'Type d’incident', selectType: 'Choisir le type d’incident', location: 'Lieu ou point de repère', useLocation: 'Utiliser ma position GPS',
    description: 'Description', attachments: 'Preuves privées (photo, vidéo ou audio)', submit: 'Continuer', cancel: 'Annuler',
    anonymous: 'Signaler anonymement', identified: 'Signaler avec mon compte', language: 'English',
  },
} as const;

type MessageKey = keyof typeof messages.en;
const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string }>({ locale: 'fr', setLocale: () => undefined, t: key => key });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem('crimex_locale') as Locale) || (navigator.language.startsWith('en') ? 'en' : 'fr'));
  const value = useMemo(() => ({ locale, setLocale: (next: Locale) => { localStorage.setItem('crimex_locale', next); document.documentElement.lang = next; setLocaleState(next); }, t: (key: MessageKey) => messages[locale][key] }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
