import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import {
  GraduationCap,
  Star,
  Users,
  Video,
  Shield,
  ArrowRight,
  BookOpen,
  Calculator,
  Globe,
  FlaskConical,
  Pen,
  Laptop,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const SUBJECTS = [
  { icon: Calculator, label: "Mathématiques", color: "text-blue-400" },
  { icon: Pen, label: "Français", color: "text-pink-400" },
  { icon: Globe, label: "Anglais", color: "text-emerald-400" },
  { icon: FlaskConical, label: "Physique-Chimie", color: "text-amber-400" },
  { icon: BookOpen, label: "Histoire-Géo", color: "text-purple-400" },
  { icon: Laptop, label: "Informatique", color: "text-cyan-400" },
];

const STEPS = [
  {
    step: "1",
    title: "Trouvez votre professeur",
    desc: "Parcourez les profils, filtrez par matière, niveau et tarif.",
  },
  {
    step: "2",
    title: "Réservez un créneau",
    desc: "Choisissez la date et l'heure qui vous conviennent.",
  },
  {
    step: "3",
    title: "Apprenez en visio",
    desc: "Rejoignez le cours en vidéo avec tableau blanc interactif.",
  },
];

// Engagements réels de la plateforme (appliqués côté base de données)
const PROMISES = [
  {
    icon: Shield,
    title: "Avis 100 % vérifiés",
    text: "Seuls les élèves qui ont réellement suivi un cours peuvent noter un professeur. Aucun avis acheté ni inventé.",
  },
  {
    icon: CheckCircle2,
    title: "Remboursé si le cours n'a pas lieu",
    text: "Vos crédits vous sont rendus si le professeur refuse ou annule, et si vous annulez plus de 24 h avant.",
  },
  {
    icon: Star,
    title: "Des tarifs transparents",
    text: "Chaque professeur affiche son tarif horaire. Vous voyez le coût exact en crédits avant de réserver.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO />

      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="font-display text-lg font-bold tracking-tight">
              Prof en Ligne
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/tutors">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Nos professeurs
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Connexion
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="gap-1">
                S'inscrire <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Cours particuliers en ligne
            </Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Progressez avec les{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                meilleurs professeurs
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
              Réservez un cours particulier en visio, de 20 minutes à 2 heures,
              au créneau qui vous convient. Tableau blanc, quiz de révision
              après chaque cours et avis 100 % vérifiés.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/tutors">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  <Users className="h-4 w-4" />
                  Voir les professeurs
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Créer un compte gratuit
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-500" /> Paiement
                sécurisé
              </span>
              <span className="flex items-center gap-1.5">
                <Video className="h-4 w-4 text-blue-500" /> Cours en visio HD
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-500" /> Avis vérifiés
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Matières ─── */}
      <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Toutes les matières, tous les niveaux
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Du collège aux études supérieures, trouvez le professeur idéal pour
            chaque discipline.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SUBJECTS.map((s) => (
              <Link to="/tutors" key={s.label}>
                <Card className="group cursor-pointer border-border/40 bg-card/50 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="flex flex-col items-center gap-3 p-6">
                    <s.icon className={`h-8 w-8 ${s.color} transition-transform group-hover:scale-110`} />
                    <span className="text-sm font-medium">{s.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comment ça marche ─── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Comment ça marche ?
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Engagements ─── */}
      <section className="border-t border-border/40 bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
            Nos engagements
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PROMISES.map((p) => (
              <Card key={p.title} className="border-border/40 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <p.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-4 font-semibold">{p.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Devenir tuteur CTA ─── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="flex flex-col items-center gap-6 p-8 text-center sm:p-12">
              <GraduationCap className="h-12 w-12 text-primary" />
              <h2 className="font-display text-2xl font-bold sm:text-3xl">
                Vous êtes professeur ?
              </h2>
              <p className="max-w-md text-muted-foreground">
                Rejoignez la communauté Prof en Ligne et donnez des cours depuis
                chez vous. Fixez vos tarifs, gérez votre emploi du temps et
                développez votre activité.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Inscription gratuite
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Liberté de tarification
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Paiement sécurisé
                </span>
              </div>
              <Link to="/become-tutor">
                <Button size="lg" className="gap-2">
                  Devenir professeur <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 bg-muted/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-display text-sm font-semibold">
                Prof en Ligne
              </span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/tutors" className="hover:text-foreground transition-colors">
                Professeurs
              </Link>
              <Link to="/become-tutor" className="hover:text-foreground transition-colors">
                Devenir tuteur
              </Link>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Connexion
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Prof en Ligne. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
