import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ArrowDownToLine, Clock, Sparkles, Wallet } from "lucide-react";
import { useEarningsBalance, useTutorEarnings, useWithdrawalRequests, useRequestWithdrawal } from "@/hooks/useEarnings";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function TutorEarnings() {
  const { data: balance, isLoading } = useEarningsBalance();
  const { data: earnings } = useTutorEarnings();
  const { data: withdrawals } = useWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();

  const handleWithdraw = () => {
    if (!balance || balance.pending <= 0) {
      toast.error("Aucun solde disponible pour un retrait");
      return;
    }
    requestWithdrawal.mutate(balance.pending, {
      onSuccess: () => toast.success("Demande de retrait envoyée !"),
      onError: () => toast.error("Erreur lors de la demande"),
    });
  };

  const statCards = [
    { label: "Solde disponible", value: `${balance?.pending || 0}€`, icon: Wallet, color: "from-success to-info" },
    { label: "Total gagné", value: `${balance?.total || 0}€`, icon: TrendingUp, color: "from-primary to-accent" },
    { label: "Déjà retiré", value: `${balance?.paid || 0}€`, icon: DollarSign, color: "from-gold to-warning" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    processing: "bg-info/15 text-info border-info/30",
    completed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Mes Revenus
          </h1>
          <p className="text-muted-foreground">Suivez vos gains et demandez un retrait</p>
        </div>
        <Button
          className="rounded-xl gradient-primary text-primary-foreground btn-glow"
          onClick={handleWithdraw}
          disabled={requestWithdrawal.isPending}
        >
          <ArrowDownToLine className="mr-2 h-4 w-4" /> Demander un retrait
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat, i) => (
          <Card key={stat.label} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold font-display mt-1">
                    {isLoading ? <span className="shimmer inline-block h-8 w-16 rounded" /> : stat.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Earnings history */}
      {earnings && earnings.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Historique des gains
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {earnings.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <p className="text-sm font-semibold">+{Number(e.amount).toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(e.created_at), "dd MMM yyyy", { locale: fr })}</p>
                </div>
                <Badge variant="outline" className={`rounded-full ${statusColors[e.status] || ""}`}>{e.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Withdrawal history */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Historique des retraits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!withdrawals || withdrawals.length === 0) ? (
            <div className="py-8 text-center">
              <ArrowDownToLine className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Aucun retrait pour le moment</p>
              <p className="text-xs text-muted-foreground mt-1">Demandez un retrait quand votre solde le permet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                  <div>
                    <p className="text-sm font-semibold">{Number(w.amount).toFixed(2)}€</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(w.created_at), "dd MMM yyyy", { locale: fr })}</p>
                  </div>
                  <Badge variant="outline" className={`rounded-full ${statusColors[w.status] || ""}`}>{w.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
