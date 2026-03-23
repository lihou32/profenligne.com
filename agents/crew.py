"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    PROF EN LIGNE — VIRTUAL COMPANY                         ║
║                    Structure Pyramidale 8 Agents IA                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║                          [1] CEO / PDG                                     ║
║                     (Stratégie & Décisions)                                ║
║                      /                  \                                  ║
║              [2] CTO                [3] CMO                                ║
║          (Architecture)          (Marketing)                               ║
║           /          \                |                                    ║
║    [4] Dev Front  [5] Dev Back   [6] Growth                               ║
║     (React/UI)   (Supabase)    (SEO/Réseaux)                              ║
║         |             |                                                    ║
║    [7] QA/Test    [8] DevOps                                               ║
║    (Tests/Bugs)  (CI/CD/Deploy)                                            ║
║                                                                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

Usage:
  python crew.py "Analyser le projet et proposer les 5 prochaines features"
  python crew.py "Auditer la sécurité du code"
  python crew.py "Préparer le lancement marketing"
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from crewai import Agent, Task, Crew, Process

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
MODEL = os.getenv("MODEL_NAME", "claude-sonnet-4-20250514")
VERBOSE = os.getenv("VERBOSE", "true").lower() == "true"

CONTEXT = """
Tu travailles sur Prof en Ligne — une marketplace française de tutorat en ligne.
Stack technique : React 18 + TypeScript + Vite 5 + Tailwind CSS + shadcn/ui
Backend : Supabase (Auth, PostgreSQL, Realtime, Edge Functions Deno)
Paiement : Stripe Checkout
CI/CD : GitHub Actions
Hébergement : Vercel
Repo : github.com/lihou32/profenligne.com

Le founder est un lycéen de 17 ans qui travaille seul.
Toutes les communications doivent être en français.
"""

# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 1 — DIRECTION (Sommet de la pyramide)
# ═══════════════════════════════════════════════════════════════════════════════

ceo = Agent(
    role="PDG / CEO",
    goal="Diriger la stratégie produit de Prof en Ligne, prioriser les features, "
         "arbitrer les décisions techniques et marketing, maximiser la croissance.",
    backstory="""Tu es le CEO virtuel de Prof en Ligne. Tu as 15 ans d'expérience
    en startups EdTech. Tu penses comme un entrepreneur : ROI, impact utilisateur,
    vitesse d'exécution. Tu supervises le CTO et le CMO. Tu prends les décisions
    finales et tu délègues intelligemment. Tu parles toujours en français.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=True,
    memory=True,
)

# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 2 — MANAGERS (Direction technique & marketing)
# ═══════════════════════════════════════════════════════════════════════════════

cto = Agent(
    role="CTO / Directeur Technique",
    goal="Garantir la qualité technique, l'architecture scalable, la sécurité "
         "et la performance de la plateforme Prof en Ligne.",
    backstory="""Tu es le CTO de Prof en Ligne. Expert React/TypeScript/Supabase
    avec 10 ans d'expérience en architecture web. Tu supervises le Dev Frontend,
    le Dev Backend, le QA et le DevOps. Tu fais des code reviews, tu proposes
    des patterns techniques, tu anticipes les problèmes de scalabilité.
    Tu connais parfaitement la stack : React 18, Vite 5, Tailwind, shadcn/ui,
    Supabase (Auth, Realtime, Edge Functions), Stripe, Sentry.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=True,
    memory=True,
)

cmo = Agent(
    role="CMO / Directeur Marketing",
    goal="Développer la visibilité de Prof en Ligne, acquérir des utilisateurs "
         "(étudiants et professeurs), optimiser le SEO et la stratégie réseaux sociaux.",
    backstory="""Tu es le CMO de Prof en Ligne. Spécialiste du marketing digital
    EdTech en France, tu connais le marché du soutien scolaire (Superprof,
    Kartable, SchoolMouv). Tu supervises le Growth Hacker. Tu crées des
    stratégies d'acquisition, des campagnes, du contenu SEO. Tu analyses
    la concurrence et tu proposes des différenciateurs.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=True,
    memory=True,
)

# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 3 — SPÉCIALISTES (Exécution)
# ═══════════════════════════════════════════════════════════════════════════════

dev_frontend = Agent(
    role="Développeur Frontend Senior",
    goal="Coder des composants React/TypeScript performants, accessibles et "
         "esthétiques pour Prof en Ligne avec Tailwind CSS et shadcn/ui.",
    backstory="""Tu es le dev frontend de Prof en Ligne. Expert React 18,
    TypeScript, Tailwind CSS, shadcn/ui, Framer Motion. Tu écris du code
    propre, typé, avec des hooks custom. Tu respectes les conventions :
    composants fonctionnels, lazy loading, error boundaries.
    Tu utilises TanStack React Query pour le data fetching.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=False,
    memory=True,
)

dev_backend = Agent(
    role="Développeur Backend Senior",
    goal="Concevoir et implémenter les API, la base de données PostgreSQL, "
         "les Edge Functions Deno et les politiques RLS sur Supabase.",
    backstory="""Tu es le dev backend de Prof en Ligne. Expert Supabase,
    PostgreSQL, Deno (Edge Functions), Row Level Security (RLS).
    Tu écris des migrations SQL propres, des fonctions plpgsql,
    des Edge Functions TypeScript/Deno. Tu gères Stripe webhooks,
    les credits system, le real-time via Supabase Channels.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=False,
    memory=True,
)

growth_hacker = Agent(
    role="Growth Hacker",
    goal="Maximiser l'acquisition et la rétention d'utilisateurs par des "
         "techniques de growth : SEO, réseaux sociaux, referral, analytics.",
    backstory="""Tu es le growth hacker de Prof en Ligne. Tu connais le SEO
    technique (meta tags, Open Graph, sitemap, schema.org), le marketing
    sur TikTok/Instagram/Twitter pour les lycéens français.
    Tu proposes des stratégies de referral, des landing pages optimisées,
    des A/B tests. Tu analyses les métriques (CAC, LTV, churn).""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=False,
    memory=True,
)

# ═══════════════════════════════════════════════════════════════════════════════
# NIVEAU 4 — SUPPORT (Qualité & Infrastructure)
# ═══════════════════════════════════════════════════════════════════════════════

qa_tester = Agent(
    role="QA Engineer / Testeur",
    goal="Garantir la qualité du code via des tests unitaires, d'intégration "
         "et E2E. Détecter les bugs avant les utilisateurs.",
    backstory="""Tu es le QA de Prof en Ligne. Expert Vitest, Testing Library,
    Playwright pour les tests E2E. Tu écris des tests pour chaque composant
    et hook. Tu vérifies l'accessibilité (a11y), la responsive, les edge
    cases. Tu fais des revues de code axées qualité.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=False,
    memory=True,
)

devops = Agent(
    role="DevOps / Infrastructure Engineer",
    goal="Maintenir le pipeline CI/CD, le déploiement Vercel, le monitoring "
         "Sentry, et optimiser les performances de production.",
    backstory="""Tu es le DevOps de Prof en Ligne. Expert GitHub Actions,
    Vercel, Sentry, Supabase hosting. Tu optimises les builds Vite,
    tu configures les source maps, le caching, les headers de sécurité.
    Tu surveilles les erreurs en production via Sentry.
    Tu gères les variables d'environnement et les secrets.""",
    llm=MODEL,
    verbose=VERBOSE,
    allow_delegation=False,
    memory=True,
)

# ═══════════════════════════════════════════════════════════════════════════════
# LISTE COMPLÈTE DES AGENTS (ordre hiérarchique)
# ═══════════════════════════════════════════════════════════════════════════════

ALL_AGENTS = [ceo, cto, cmo, dev_frontend, dev_backend, growth_hacker, qa_tester, devops]

# ═══════════════════════════════════════════════════════════════════════════════
# MISSIONS PRÉDÉFINIES (templates de tâches courantes)
# ═══════════════════════════════════════════════════════════════════════════════

def mission_audit_complet():
    """Audit complet du projet par tous les agents en parallèle."""
    return [
        Task(
            description=f"""{CONTEXT}
            En tant que CEO, fais un audit stratégique complet :
            1. Analyse SWOT de Prof en Ligne vs Superprof/Kartable
            2. Les 5 features prioritaires pour les 30 prochains jours
            3. Les risques business à anticiper
            4. KPIs à suivre dès le lancement""",
            expected_output="Rapport stratégique complet en français avec SWOT, roadmap 30 jours, risques et KPIs.",
            agent=ceo,
        ),
        Task(
            description=f"""{CONTEXT}
            En tant que CTO, fais un audit technique :
            1. Architecture actuelle : forces et faiblesses
            2. Dette technique identifiée
            3. Problèmes de sécurité potentiels (RLS, auth, XSS)
            4. Recommandations de performance (bundle size, lazy loading)
            5. Plan de tests manquants""",
            expected_output="Rapport technique avec architecture review, dette technique, failles sécurité et plan d'action.",
            agent=cto,
        ),
        Task(
            description=f"""{CONTEXT}
            En tant que CMO, fais un audit marketing :
            1. Positionnement actuel vs concurrents (Superprof, Kartable, SchoolMouv)
            2. Stratégie SEO : mots-clés cibles, meta tags manquants
            3. Plan réseaux sociaux (TikTok, Instagram) pour lycéens
            4. Stratégie de lancement (les 2 premières semaines)""",
            expected_output="Plan marketing complet avec positionnement, SEO, social media et calendrier de lancement.",
            agent=cmo,
        ),
    ]


def mission_next_sprint():
    """Planifier le prochain sprint avec toute l'équipe."""
    return [
        Task(
            description=f"""{CONTEXT}
            CEO : Définis les objectifs du prochain sprint (2 semaines).
            Priorise les tâches par impact utilisateur. Maximum 8 tâches.""",
            expected_output="Liste priorisée de 8 tâches max avec justification business.",
            agent=ceo,
        ),
        Task(
            description=f"""{CONTEXT}
            Dev Frontend : Pour chaque tâche définie par le CEO, estime la
            complexité technique (S/M/L/XL) et propose une implémentation React.""",
            expected_output="Estimation technique par tâche avec approche React/TypeScript proposée.",
            agent=dev_frontend,
        ),
        Task(
            description=f"""{CONTEXT}
            Dev Backend : Pour chaque tâche, identifie les changements Supabase
            nécessaires (tables, RLS, Edge Functions, migrations SQL).""",
            expected_output="Liste des changements backend par tâche avec SQL/RLS nécessaires.",
            agent=dev_backend,
        ),
        Task(
            description=f"""{CONTEXT}
            QA : Définis le plan de test pour ce sprint. Quels tests unitaires,
            d'intégration et E2E sont nécessaires ?""",
            expected_output="Plan de test complet avec cas de test par feature.",
            agent=qa_tester,
        ),
    ]


def mission_feature(feature_description: str):
    """Concevoir et planifier une feature spécifique."""
    return [
        Task(
            description=f"""{CONTEXT}
            CEO : Valide la feature suivante du point de vue business :
            "{feature_description}"
            - Est-ce prioritaire ? Pourquoi ?
            - Quel impact sur les utilisateurs ?
            - Critères d'acceptation""",
            expected_output="Validation business avec critères d'acceptation.",
            agent=ceo,
        ),
        Task(
            description=f"""{CONTEXT}
            CTO : Conçois l'architecture technique pour :
            "{feature_description}"
            - Composants React nécessaires
            - Tables/colonnes Supabase
            - Politiques RLS
            - Edge Functions si nécessaire""",
            expected_output="Document d'architecture technique complet.",
            agent=cto,
        ),
        Task(
            description=f"""{CONTEXT}
            Dev Frontend : Écris le code React/TypeScript pour :
            "{feature_description}"
            Utilise shadcn/ui, Tailwind, TanStack Query.
            Code complet, prêt à copier-coller.""",
            expected_output="Code React/TypeScript complet et fonctionnel.",
            agent=dev_frontend,
        ),
        Task(
            description=f"""{CONTEXT}
            Dev Backend : Écris les migrations SQL et Edge Functions pour :
            "{feature_description}"
            Inclus les politiques RLS.""",
            expected_output="Migrations SQL + Edge Functions complètes.",
            agent=dev_backend,
        ),
        Task(
            description=f"""{CONTEXT}
            QA : Écris les tests Vitest pour :
            "{feature_description}"
            Tests unitaires + tests d'intégration.""",
            expected_output="Suite de tests complète avec Vitest/Testing Library.",
            agent=qa_tester,
        ),
    ]


def mission_marketing_launch():
    """Préparer le lancement marketing."""
    return [
        Task(
            description=f"""{CONTEXT}
            CMO : Crée la stratégie de lancement complète :
            1. Message principal (tagline)
            2. Audiences cibles (personas)
            3. Canaux d'acquisition prioritaires
            4. Calendrier semaine par semaine (4 semaines)""",
            expected_output="Stratégie de lancement détaillée sur 4 semaines.",
            agent=cmo,
        ),
        Task(
            description=f"""{CONTEXT}
            Growth Hacker : Crée le plan SEO + social media :
            1. 20 mots-clés cibles avec volume de recherche estimé
            2. Structure des meta tags pour chaque page
            3. 10 idées de posts TikTok/Instagram pour lycéens
            4. Stratégie de referral (comment viraliser)""",
            expected_output="Plan SEO détaillé + 10 idées de contenu social + stratégie referral.",
            agent=growth_hacker,
        ),
        Task(
            description=f"""{CONTEXT}
            DevOps : Prépare l'infrastructure pour le lancement :
            1. Checklist de production (HTTPS, headers, CSP)
            2. Monitoring Sentry configuré
            3. Alertes si le site tombe
            4. Plan de scaling si afflux d'utilisateurs""",
            expected_output="Checklist de production + monitoring + plan de scaling.",
            agent=devops,
        ),
    ]

# ═══════════════════════════════════════════════════════════════════════════════
# RUNNER — Point d'entrée principal
# ═══════════════════════════════════════════════════════════════════════════════

MISSIONS = {
    "audit": ("Audit complet du projet", mission_audit_complet),
    "sprint": ("Planifier le prochain sprint", mission_next_sprint),
    "launch": ("Préparer le lancement marketing", mission_marketing_launch),
}


def run_mission(mission_name: str, custom_prompt: str = ""):
    """Lance une mission avec le Crew hiérarchique."""

    if mission_name == "feature" and custom_prompt:
        tasks = mission_feature(custom_prompt)
        label = f"Feature : {custom_prompt[:60]}"
    elif mission_name in MISSIONS:
        label, task_fn = MISSIONS[mission_name]
        tasks = task_fn()
    elif custom_prompt:
        # Mission libre : le CEO reçoit la demande et délègue
        tasks = [
            Task(
                description=f"""{CONTEXT}
                Le founder te demande : "{custom_prompt}"
                
                En tant que CEO, analyse cette demande et produis un plan
                d'action détaillé. Délègue aux bons agents si nécessaire.""",
                expected_output="Plan d'action complet en français.",
                agent=ceo,
            )
        ]
        label = f"Mission libre : {custom_prompt[:60]}"
    else:
        print("❌ Usage: python crew.py <mission> [prompt]")
        print("   Missions: audit | sprint | launch | feature | <texte libre>")
        sys.exit(1)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  🚀 PROF EN LIGNE — VIRTUAL COMPANY                        ║
║  Mission : {label:<49}║
║  Agents  : {len(ALL_AGENTS)} agents en structure pyramidale            ║
║  Process : Hiérarchique (CEO → Managers → Spécialistes)     ║
╚══════════════════════════════════════════════════════════════╝
    """)

    crew = Crew(
        agents=ALL_AGENTS,
        tasks=tasks,
        process=Process.hierarchical,
        manager_agent=ceo,
        verbose=VERBOSE,
        memory=True,
        planning=True,
    )

    result = crew.kickoff()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  ✅ MISSION TERMINÉE                                        ║
╚══════════════════════════════════════════════════════════════╝
    """)
    print(result)
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
🏢 Prof en Ligne — Virtual Company (8 agents IA)

Usage:
  python crew.py audit               → Audit complet (stratégie + tech + marketing)
  python crew.py sprint              → Planifier le prochain sprint  
  python crew.py launch              → Préparer le lancement marketing
  python crew.py feature "desc"      → Concevoir une feature spécifique
  python crew.py "texte libre"       → Mission libre (le CEO décide)

Exemples:
  python crew.py audit
  python crew.py feature "système de chat en temps réel entre élève et prof"
  python crew.py "Comment améliorer le taux de conversion de la landing page ?"
        """)
        sys.exit(0)

    mission = sys.argv[1]
    prompt = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""

    if mission in MISSIONS:
        run_mission(mission)
    elif mission == "feature":
        if not prompt:
            print("❌ Décris la feature : python crew.py feature \"description\"")
            sys.exit(1)
        run_mission("feature", prompt)
    else:
        # Tout le reste = mission libre
        full_prompt = mission + (" " + prompt if prompt else "")
        run_mission("free", full_prompt)
