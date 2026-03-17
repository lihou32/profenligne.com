import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, Zap, Crown } from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    name: "Découverte",
    price: "0",
    period: "€/mois",
    description: "Pour explorer la plateforme",
    icon: Star,
    popular: false,
    prestige: false,
    features: [
      { text: "3 leçons par mois", included: true },
      { text: "Accès limité aux docs", included: true },
      { text: "Support email (48h)", included: true },
      { text: "Quiz de base", included: true },
      { text: "Tuteur IA illimité", included: false },
      { text: "Cours en direct", included: false },
      { text: "Club Prestige", included: false },
      { text: "Certificats", included: false },
    ],
  },
  {
    name: "Pro",
    price: "29",
    period: "€/mois",
    description: "Le choix des élèves sérieux",
    icon: Zap,
    popular: true,
    prestige: false,
    features: [
      { text: "Leçons illimitées", included: true },
      { text: "Tuteur IA illimité (Gemini)", included: true },
      { text: "Corrigés détaillés", included: true },
      { text: "Support prioritaire (24h)", included: true },
      { text: "Quiz avancés & tournois", included: true },
      { text: "Certificats de réussite", included: true },
      { text: "Club Prestige", included: false },
      { text: "Correction devoirs < 30min", included: false },
    ],
  },
  {
    name: "Prestige",
    price: "99",
    period: "€/mois",
    description: "L'excellence sans compromis",
    icon: Crown,
    popular: false,
    prestige: true,
    features: [
      { text: "Tout le plan Pro inclus", included: true },
      { text: "Club Prestige exclusif", included: true },
      { text: "Tuteurs élite 17h-22h", included: true },
      { text: "Correction devoirs en direct", included: true },
      { text: "Suivi parental détaillé", included: true },
      { text: "Garantie Satisfait ou Remboursé", included: true },
    ],
  },
];

export default function Pricing() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight font-display">Choisissez votre formule</h1>
        <p className="mt-2 text-muted-foreground">Des tarifs adaptés à tous les niveaux d'ambition</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`glass-card relative transition-all hover:shadow-xl ${
              plan.popular ? "border-gold ring-2 ring-gold/30" : ""
            } ${plan.prestige ? "border-accent/50" : ""}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-black font-bold text-xs px-3">
                LE PLUS POPULAIRE
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl mb-3 ${
                plan.prestige
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : plan.popular
                    ? "gradient-primary"
                    : "bg-muted"
              }`}>
                <plan.icon className={`h-6 w-6 ${
                  plan.prestige || plan.popular ? "text-primary-foreground" : "text-muted-foreground"
                }`} />
              </div>
              <CardTitle className="font-display">{plan.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-3">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-center gap-2 text-sm">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={feature.included ? "" : "text-muted-foreground/50"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${
                  plan.prestige
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
                    : plan.popular
                      ? "gradient-primary text-primary-foreground"
                      : ""
                }`}
                variant={plan.popular || plan.prestige ? "default" : "outline"}
                onClick={() => {
                  if (plan.price === "0") {
                    toast.info("Vous utilisez déjà la formule Découverte !");
                  } else {
                    toast.info("Les abonnements seront disponibles prochainement.");
                  }
                }}
              >
                {plan.price === "0" ? "Commencer gratuitement" : "S'abonner"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
