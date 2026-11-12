/**
 * Informations légales affichées sur le site (mentions légales, CGU/CGV, confidentialité).
 *
 * ⚠️ À compléter avant le lancement : les champs marqués TODO.
 * Tant qu'un champ vaut `null`, la page affiche « en cours d'immatriculation » ou « à venir ».
 */
export const LEGAL = {
  brand: "Ton Prof en Ligne",
  /** TODO : passer à https://tonprofenligne.com une fois le domaine acheté. */
  siteUrl: "https://profenligne-com.vercel.app",
  /** Date de dernière mise à jour des documents (CGU/CGV, confidentialité). */
  updatedAt: "12 novembre 2026",

  editor: {
    name: "Lihou Teboul",
    status: "Entrepreneur individuel (EI), régime micro-entrepreneur",
    address: "10 rue d'Alsace, 92300 Levallois-Perret, France",
    /** TODO : numéro SIREN reçu après l'immatriculation (guichet unique INPI). */
    siren: null as string | null,
    email: "support@tonprofenligne.com",
    /** TODO : téléphone de contact (obligatoire dans les mentions légales). */
    phone: null as string | null,
  },

  hosts: [
    {
      role: "Hébergement du site",
      name: "Vercel Inc.",
      address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
      url: "https://vercel.com",
    },
    {
      role: "Base de données, comptes et fichiers",
      name: "Supabase",
      address: null as string | null,
      url: "https://supabase.com",
    },
  ],

  /** TODO : médiateur de la consommation (nom, adresse, site). Obligatoire avant d'accepter des paiements. */
  mediator: null as null | { name: string; address: string; url: string },
} as const

/** Sous-traitants qui traitent des données pour le site (politique de confidentialité). */
export const PROCESSORS = [
  { name: "Supabase", purpose: "Comptes, base de données, fichiers, envoi des e-mails de connexion" },
  { name: "Vercel", purpose: "Hébergement et diffusion du site" },
  { name: "Sentry", purpose: "Détection des erreurs ; enregistrement de sessions seulement si tu l'acceptes" },
  { name: "Resend", purpose: "E-mails de service (réservations, rappels de cours)" },
  { name: "Jitsi (8x8)", purpose: "Visioconférence pendant les cours" },
  { name: "Google (Gemini) ou Groq", purpose: "Quiz et cartes mentales après un cours (seuls la matière et le thème sont envoyés)" },
] as const

/** Liens officiels sur les obligations fiscales et sociales des profs. */
export const TAX_LINKS = [
  { href: "https://www.impots.gouv.fr/economie-collaborative-et-plateformes-numeriques", label: "impots.gouv.fr — revenus des plateformes" },
  { href: "https://www.urssaf.fr", label: "urssaf.fr — cotisations sociales" },
] as const

/** Pages légales, liées depuis le pied de page de toutes les pages. */
export const LEGAL_LINKS = [
  { to: "/mentions-legales", label: "Mentions légales" },
  { to: "/conditions", label: "CGU / CGV" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/fonctionnement", label: "Fonctionnement de la plateforme" },
] as const
