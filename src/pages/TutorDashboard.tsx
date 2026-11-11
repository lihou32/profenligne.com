import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTutorStats, useTutorLessons, useUpdateTutorStatus, useTutorProfile } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import {
  DollarSign, BookOpen, Star, Users, Video, Clock, Calendar,
  TrendingUp, Sparkles, ArrowRight, Zap, CheckCircle2, XCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useConfirmLesson, useCancelLesson } from "@/hooks/useData";
import { friendlyError, isRoomOpen } from "@/lib/credits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActiveLessonBanner } from "@/components/lessons/ActiveLessonBanner";

export default function TutorDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useTutorStats();
  const { data: lessons } = useTutorLessons();
  const { data: tutorProfile } = useTutorProfile();
  const updateStatus = useUpdateTutorStatus();
  const confirmLesson = useConfirmLesson();
  const cancelLesson = useCancelLesson();
  const displayName = profile?.first_name || "Professeur";
  const isOnline = tutorProfile?.status === "online";

  const now = Date.now();
  const pendingLessons = (lessons || []).filter(
    (l) => l.status === "pending" && new Date(l.scheduled_at).getTime() > now,
  );
  const upcomingLessons = (lessons || []).filter(
    (l) => ["confirmed", "in_progress"].includes(l.status)
      && (l.status === "in_progress" || new Date(l.scheduled_at).getTime() + l.duration_minutes * 60_000 > now),
  );

  // Cours actif : in_progress, ou confirmed démarré depuis moins de duration_minutes
  const activeLesson = upcomingLessons.find(
    (l) => l.status === "in_progress" || isRoomOpen(l.scheduled_at, l.duration_minutes),
  );

  const handleToggleStatus = () => {
    if (!tutorProfile) {
      toast.error("Complétez d'abord votre profil professeur");
      return;
    }
    updateStatus.mutate(isOnline ? "offline" : "online", {
      onError: (e) => toast.error(friendlyError(e)),
    });
  };

  const handleAccept = (id: string) => {
    confirmLesson.mutate(id, {
      onSuccess: () => toast.success("Cours confirmé ! L'élève est prévenu."),
      onError: (e) => toast.error(friendlyError(e)),
    });
  };

  const handleReject = (lesson: { id: string; tutor_id: string }) => {
    cancelLesson.mutate(lesson, {
      onSuccess: () => toast.success("Demande refusée — l'élève est remboursé"),
      onError: (e) => toast.error(friendlyError(e)),
    });
  };

  const statCards = [
    { label: "Revenus du mois", value: `${stats?.monthlyRevenue || 0}€`, icon: DollarSign, color: "from-success to-info" },
    { label: "Cours ce mois", value: String(stats?.monthlyLessons || 0), icon: BookOpen, color: "from-primary to-accent" },
    { label: "Note moyenne", value: stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "—", icon: Star, color: "from-gold to-warning" },
    { label: "Élèves actifs", value: String(stats?.activeStudents || 0), icon: Users, color: "from-info to-primary" },
  ];

  // Real weekly earnings for the current month
  const { data: earningsRaw } = useQuery({
    queryKey: ["tutor-weekly-earnings", profile?.user_id],
    enabled: !!profile?.user_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const { data, error } = await supabase
        .from("tutor_earnings")
        .select("amount, created_at")
        .eq("tutor_id", profile!.user_id)
        .gte("created_at", monthStart.toISOString())
        .lte("created_at", monthEnd.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const chartData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

    return weeks.map((weekStart, i) => {
      const weekEnd = i < weeks.length - 1 ? weeks[i + 1] : monthEnd;
      const total = (earningsRaw ?? [])
        .filter((e) => {
          const d = new Date(e.created_at);
          return isWithinInterval(d, { start: weekStart, end: weekEnd });
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { week: `Sem ${i + 1}`, revenus: Math.round(total) };
    });
  }, [earningsRaw]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">
            Bonjour, <span className="gradient-text">{displayName}</span> 👨‍🏫
          </h1>
          <p className="text-muted-foreground mt-1">Gérez vos cours et vos élèves</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-xl">
            <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-sm font-medium">{isOnline ? "En ligne" : "Hors ligne"}</span>
            <Switch checked={isOnline} onCheckedChange={handleToggleStatus} className="ml-1" />
          </div>
        </div>
      </div>

      {/* Profil prof incomplet : invisible dans la marketplace tant que non complété */}
      {tutorProfile === null && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Complétez votre profil professeur</p>
              <p className="text-sm text-muted-foreground">Ajoutez vos matières et votre tarif pour apparaître dans la marketplace et recevoir des demandes.</p>
            </div>
            <Button asChild className="gradient-primary text-primary-foreground shrink-0">
              <Link to="/become-tutor">Compléter mon profil <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {tutorProfile?.is_suspended && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-5 text-sm">
            <p className="font-semibold text-destructive">Profil suspendu</p>
            <p className="text-muted-foreground">Votre profil n'apparaît plus dans la marketplace. Contactez le support pour plus d'informations.</p>
          </CardContent>
        </Card>
      )}

      {/* Cours actif — banner prioritaire */}
      {activeLesson && <ActiveLessonBanner lesson={activeLesson} role="tutor" />}

      {/* Hero Banner */}
      <div className="gradient-hero rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="xp-badge"><Zap className="h-3 w-3" /> PRO</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-bold font-display text-primary-foreground">
            Tableau de bord <span className="gold-text">Professeur</span>
          </h2>
          <p className="text-primary-foreground/70 mt-2 text-sm max-w-lg">
            {pendingLessons.length > 0
              ? `Vous avez ${pendingLessons.length} demande(s) de cours en attente`
              : "Tous vos cours sont à jour. Mettez-vous en ligne pour recevoir de nouvelles demandes !"}
          </p>
          <div className="flex gap-3 mt-5">
            <Button asChild className="rounded-xl bg-primary-foreground/15 backdrop-blur border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25">
              <Link to="/lessons" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Mes cours
              </Link>
            </Button>
            <Button asChild className="rounded-xl bg-primary-foreground/15 backdrop-blur border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25">
              <Link to="/earnings" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Mes revenus
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Revenus du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="€" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Line type="linear" dataKey="revenus" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pending requests */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" /> Demandes en attente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLessons.length === 0 && (
              <div className="py-6 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Aucune demande</p>
              </div>
            )}
            {pendingLessons.slice(0, 4).map((lesson) => (
              <div key={lesson.id} className="rounded-xl border border-border/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
                      {(lesson.student_profile?.first_name?.[0] || "E").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {lesson.student_profile?.first_name || "Élève"} {lesson.student_profile?.last_name || ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{lesson.subject}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(lesson.scheduled_at), "dd MMM à HH:mm", { locale: fr })}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-lg gradient-primary text-primary-foreground text-xs h-8" onClick={() => handleAccept(lesson.id)} disabled={confirmLesson.isPending}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Accepter
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 rounded-lg text-destructive hover:bg-destructive/10 text-xs h-8" onClick={() => handleReject(lesson)} disabled={cancelLesson.isPending}>
                    <XCircle className="mr-1 h-3 w-3" /> Refuser
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Lessons */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Prochains cours
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
            <Link to="/lessons" className="flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingLessons.length === 0 && (
            <div className="py-8 text-center">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Aucun cours à venir</p>
            </div>
          )}
          {upcomingLessons.slice(0, 5).map((lesson, i) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-xl border border-border/30 p-4 hover:bg-secondary/50 hover:border-primary/20 transition-all group animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-bold">
                    {(lesson.student_profile?.first_name?.[0] || "E").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{lesson.student_profile?.first_name || "Élève"} — {lesson.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(lesson.scheduled_at), "dd MMM à HH:mm", { locale: fr })} · {lesson.duration_minutes}min
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full px-3 bg-success/15 text-success border-success/30" variant="outline">
                  {lesson.status === "in_progress" ? "En cours" : "Confirmé"}
                </Badge>
                {(lesson.status === "in_progress" || isRoomOpen(lesson.scheduled_at, lesson.duration_minutes)) && (
                  <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground btn-glow text-xs" asChild>
                    <Link to={`/room/${lesson.id}`}><Video className="mr-1 h-3 w-3" /> {lesson.status === "in_progress" ? "Rejoindre" : "Démarrer"}</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
