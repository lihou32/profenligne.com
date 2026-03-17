import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Sparkles, Zap, Crown, Check, Wallet } from "lucide-react";
import { useUserCredits, useCreditTransactions } from "@/hooks/useCredits";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const packs = [
  { credits: 5, price: 25, popular: false, label: "Découverte" },
  { credits: 10, price: 45, popular: true, label: "Standard" },
  { credits: 20, price: 80, popular: false, label: "Premium" },
];

export default function BuyCredits() {
  const { data: userCredits } = useUserCredits();
  const { data: transactions } = useCreditTransactions();

  const handleBuy = (credits: number) => {
    toast.info("L'achat de crédits via Stripe sera configuré prochainement !");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight font-display flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-gold" /> Acheter des Crédits
        </h1>
        <p className="text-muted-foreground mt-1">1 crédit = 1 cours avec un professeur</p>
      </div>

      {/* Current balance */}
      <Card className="glass-card max-w-md mx-auto">
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-warning shadow-lg">
              <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mon solde</p>
              <p className="text-3xl font-bold font-display">{userCredits?.balance ?? 0} <span className="text-sm text-muted-foreground">crédits</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
        {packs.map((pack, i) => (
          <Card
            key={pack.credits}
            className={`glass-card transition-all duration-300 hover:border-primary/30 ${pack.popular ? "ring-2 ring-primary/50 scale-105" : ""}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <CardHeader className="text-center pb-2">
              {pack.popular && (
                <Badge className="mx-auto mb-2 rounded-full bg-primary/15 text-primary border-primary/30 px-3">
                  <Zap className="mr-1 h-3 w-3" /> Populaire
                </Badge>
              )}
              <CardTitle className="text-lg font-display">{pack.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div>
                <p className="text-4xl font-bold font-display gradient-text">{pack.credits}</p>
                <p className="text-sm text-muted-foreground">crédits</p>
              </div>
              <p className="text-2xl font-bold">{pack.price}€</p>
              <p className="text-xs text-muted-foreground">{(pack.price / pack.credits).toFixed(2)}€ / cours</p>
              <ul className="text-xs text-muted-foreground space-y-1.5 text-left">
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> {pack.credits} cours inclus</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Valable 6 mois</li>
                <li className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Support prioritaire</li>
              </ul>
              <Button
                className={`w-full rounded-xl font-semibold ${pack.popular ? "gradient-primary text-primary-foreground btn-glow" : ""}`}
                variant={pack.popular ? "default" : "outline"}
                onClick={() => handleBuy(pack.credits)}
              >
                <CreditCard className="mr-2 h-4 w-4" /> Acheter
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction history */}
      {transactions && transactions.length > 0 && (
        <Card className="glass-card max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Historique
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <p className="text-sm font-semibold">{tx.amount > 0 ? "+" : ""}{tx.amount} crédits</p>
                  <p className="text-xs text-muted-foreground">{tx.description || tx.type}</p>
                </div>
                <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), "dd MMM yyyy", { locale: fr })}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
