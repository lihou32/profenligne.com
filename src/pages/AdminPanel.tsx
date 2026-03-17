import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, DollarSign, TrendingUp, MoreHorizontal, Mail, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAdminStats } from "@/hooks/useAdminStats";
import { AdminCharts } from "@/components/admin/AdminCharts";
import { AdminTutorsTab } from "@/components/admin/AdminTutorsTab";
import { AdminLessonsTab } from "@/components/admin/AdminLessonsTab";

interface Preregistration {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  change,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  change: string | null;
  loading: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            {change !== null && (
              <p className={`text-xs ${change.startsWith("+") ? "text-success" : "text-destructive"}`}>
                {change}
              </p>
            )}
          </div>
          <div className="gradient-primary flex h-10 w-10 items-center justify-center rounded-xl">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPanel() {
  const [preregistrations, setPreregistrations] = useState<Preregistration[]>([]);
  const [loadingPrereg, setLoadingPrereg] = useState(false);
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const exportToCSV = () => {
    if (preregistrations.length === 0) return;
    const header = "Email,Rôle,Date d'inscription";
    const rows = preregistrations.map((p) => {
      const role = p.role === "student" ? "Élève" : "Tuteur";
      const date = format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: fr });
      return `${p.email},${role},${date}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preinscrits_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchPreregistrations = async () => {
      setLoadingPrereg(true);
      const { data } = await supabase
        .from("preregistrations")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setPreregistrations(data);
      setLoadingPrereg(false);
    };
    fetchPreregistrations();
  }, []);

  const statsCards = [
    {
      label: "Utilisateurs",
      value: stats ? stats.totalUsers.toLocaleString("fr-FR") : "—",
      icon: Users,
      change: null,
    },
    {
      label: "Cours ce mois",
      value: stats ? stats.lessonsThisMonth.toString() : "—",
      icon: BookOpen,
      change: stats?.lessonsChange != null
        ? `${stats.lessonsChange >= 0 ? "+" : ""}${stats.lessonsChange}% vs mois dernier`
        : null,
    },
    {
      label: "Revenus",
      value: stats ? `${stats.revenueThisMonth.toLocaleString("fr-FR")}€` : "—",
      icon: DollarSign,
      change: stats?.revenueChange != null
        ? `${stats.revenueChange >= 0 ? "+" : ""}${stats.revenueChange}% vs mois dernier`
        : null,
    },
    {
      label: "Satisfaction",
      value: stats ? `${stats.satisfactionPct}%` : "—",
      icon: TrendingUp,
      change: stats ? `Basé sur ${stats.reviewCount} avis` : null,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Admin</h1>
        <p className="text-muted-foreground">Gérez votre plateforme</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <StatCard key={stat.label} {...stat} loading={statsLoading} />
        ))}
      </div>

      <AdminCharts />

      <Tabs defaultValue="preregistrations">
        <TabsList>
          <TabsTrigger value="preregistrations">Préinscrits</TabsTrigger>
          <TabsTrigger value="tutors">Tuteurs</TabsTrigger>
          <TabsTrigger value="lessons">Cours</TabsTrigger>
        </TabsList>

        <TabsContent value="preregistrations" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Liste d'attente
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{preregistrations.length} inscrit(s)</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={preregistrations.length === 0}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Exporter CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPrereg ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : preregistrations.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  Aucun préinscrit pour le moment
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-4">Email</th>
                      <th className="p-4">Rôle</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preregistrations.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4 font-medium">{p.email}</td>
                        <td className="p-4">
                          <Badge variant="secondary">
                            {p.role === "student" ? "Élève" : "Tuteur"}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {format(new Date(p.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutors" className="mt-4">
          <AdminTutorsTab />
        </TabsContent>

        <TabsContent value="lessons" className="mt-4">
          <AdminLessonsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
