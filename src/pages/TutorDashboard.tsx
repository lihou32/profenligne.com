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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useUpdateLesson } from "@/hooks/useData";
import { toast } from "sonner";
import { ActiveLessonBanner } from "@/components/lessons/ActiveLessonBanner";

export default function TutorDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading } = useTutorStats();
  const { data: lessons } = useTutorLessons();
  const { data: tutorProfile } = useTutorProfile();
  const updateStatus = useUpdateTutorStatus();
  const updateLesson = useUpdateLesson();
  const displayName = profile?.first_name || "Professeur";
  const isOnline = tutorProfile?.status === "online";

  const pendingLessons = (lessons || []).filter((l: any) => l.status === "pending");
  const upcomingLessons = (lessons || []).filter((l: any) => ["confirmed", "in_progress"].includes(l.status));

  // Cours actif maintenant (démarré il y a moins de 2h ou en cours)
  const activeLesson = upcomingLessons.find((l: any) => {
    const start = new Date(l.scheduled_at).getTime();
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    return l.status === "in_progress" || (l.status === "confirmed" && now >= start - 5 * 60 * 1000 && now < start + twoHours);
  });

  const handleToggleStatus = () => {
    updateStatus.mutate(isOnline ? "offline" : "online");
  };

  const handleAccept = (id: string) => {
    updateLesson.mutate({ id, status: "confirmed" }, {
      onSuccess: () => toast.success("Cours confirmé !"),
    });
  };

  const handleReject = (id: string) => {
    updateLesson.mutate({ id, status: "cancelled" }, {
      onSuccess: () => toast.success("Cours refusé"),
    });
  };

  const statCards = [
    { label: "Revenus du mois", value: `${stats?.monthlyRevenue || 0}€`, icon: DollarSign, color: "from-success to-info" },
    { label: "Cours ce mois", value: String(stats?.monthlyLessons || 0), icon: BookOpen, color: "from-primary to-accent" },
    { label: "Note moyenne", value: stats?.avgRating ? Number(stats.avgRating).toFixed(1) : "—", icon: Star, color: "from-gold to-warning" },
    { label: "Élèves actifs", value: String(stats?.activeStudents || 0), icon: Users, color: "from-info to-primary" },
  ];

  // Mock chart data based on stats
  const chartData = [
    { week: "Sem 1", revenus: Math.round((stats?.monthlyRevenue || 0) * 0.15) },
    { week: "Sem 2", revenus: Math.round((stats?.monthlyRevenue || 0) * 0.25) },
    { week: "Sem 3", revenus: Math.round((stats?.monthlyRevenue || 0) * 0.30) },
    { week: "Sem 4", revenus: Math.round((stats?.monthlyRevenue || 0) * 0.30) },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270 18% 24%)" />
                <XAxis dataKey="week" stroke="hsl(270 12% 60%)" fontSize={12} />
                <YAxis stroke="hsl(270 12% 60%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(270 25% 18%)",
                    border: "1px solid hsl(270 18% 24%)",
                    borderRadius: "12px",
                    color: "hsl(270 10% 95%)",
                  }}
                />
                <Line type="monotone" dataKey="revenus" stroke="hsl(265 80% 65%)" strokeWidth={3} dot={{ fill: "hsl(265 80% 65%)", r: 5 }} />
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
            {pendingLessons.slice(0, 4).map((lesson: any) => (
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
                  <Button size="sm" className="flex-1 rounded-lg gradient-primary text-primary-foreground text-xs h-8" onClick={() => handleAccept(lesson.id)}>
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Accepter
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 rounded-lg text-destructive hover:bg-destructive/10 text-xs h-8" onClick={() => handleReject(lesson.id)}>
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
          {upcomingLessons.slice(0, 5).map((lesson: any, i: number) => (
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
                <Badge className="rounded-full px-3 bg-success/15 text-success border-success/30" variant="outline">Confirmé</Badge>
                <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground btn-glow text-xs" asChild>
                  <Link to={`/room/${lesson.id}`}><Video className="mr-1 h-3 w-3" /> Démarrer</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
