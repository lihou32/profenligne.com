import { MIN_WITHDRAWAL_EUR, formatEur, friendlyError } from "@/lib/credits";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ArrowDownToLine, Clock, Sparkles, Wallet } from "lucide-react";
import { useEarningsBalance, useTutorEarnings, useWithdrawalRequests, useRequestWithdrawal } from "@/hooks/useEarnings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function TutorEarnings() {
  useDocumentTitle("Mes revenus");
  const { data: balance, isLoading } = useEarningsBalance();
  const { data: earnings } = useTutorEarnings();
  const { data: withdrawals } = useWithdrawalRequests();
  const requestWithdrawal = useRequestWithdrawal();

  const handleWithdraw = () => {
    if (!balance || balance.available < MIN_WITHDRAWAL_EUR) {
      toast.error(`Retrait possible à partir de ${formatEur(MIN_WITHDRAWAL_EUR)} disponibles`);
      return;
    }
    requestWithdrawal.mutate(balance.available, {
      onSuccess: () => toast.success("Demande de retrait envoyée !"),
      onError: (e) => toast.error(friendlyError(e, "Erreur lors de la demande")),
    });
  };

  const statCards = [
    { label: "Disponible au retrait", value: formatEur(balance?.available), icon: Wallet, color: "bg-mint-soft text-mint" },
    { label: "Total gagné", value: formatEur(balance?.total), icon: TrendingUp, color: "bg-peri-soft text-peri" },
    { label: "Déjà versé", value: formatEur(balance?.paid), icon: DollarSign, color: "bg-hl-soft text-hl" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    processing: "bg-info/15 text-info border-info/30",
    completed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Revenus" title="Ce que tu as gagné" subtitle="Tes gains par cours et tes demandes de retrait." />
        <Button
         
          onClick={handleWithdraw}
          disabled={requestWithdrawal.isPending || !balance || balance.available < MIN_WITHDRAWAL_EUR}
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
                  <p className="text-3xl font-medium font-display mt-1">
                    {isLoading ? <span className="shimmer inline-block h-8 w-16 rounded" /> : stat.value}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.color}`}>
                  <stat.icon className="h-6 w-6 " />
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
            {earnings.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                <div>
                  <p className="text-sm font-semibold">+{formatEur(e.amount)}</p>
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
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3">
                  <div>
                    <p className="text-sm font-semibold">{formatEur(w.amount)}</p>
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
