import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, useTutors } from "@/hooks/useData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Clock, TrendingUp, Video, Star, CalendarDays, Sparkles, ArrowRight, Users, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookLessonDialog } from "@/components/lessons/BookLessonDialog";
import { ActiveLessonBanner } from "@/components/lessons/ActiveLessonBanner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { XPBadge } from "@/components/gamification/XPBadge";

export default function StudentDashboard() {
  const { profile, user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();
  const { data: tutors } = useTutors();
  const displayName = profile?.first_name || "Étudiant";

  const { data: myXp = 0 } = useQuery({
    queryKey: ["my-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_xp")
        .select("total_xp")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.total_xp ?? 0;
    },
  });

  // Cours actif en ce moment (confirmed ou in_progress commencé il y a moins de 2h)
  const activeLesson = (stats?.upcomingLessons || []).find((l) => {
    const start = new Date(l.scheduled_at).getTime();
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    return l.status === "in_progress" || (l.status === "confirmed" && now >= start - 5 * 60 * 1000 && now < start + twoHours);
  });

  const statCards = [
    { label: "Heures de cours", value: stats?.totalHours || "0", icon: Clock, color: "from-primary to-info" },
    { label: "Cours terminés", value: String(stats?.completedLessons || 0), icon: BookOpen, color: "from-success to-info" },
    { label: "Moyenne", value: stats?.averageRating || "—", icon: TrendingUp, color: "from-gold to-warning" },
    { label: "Cours à venir", value: String(stats?.upcomingLessons?.length || 0), icon: CalendarDays, color: "from-accent to-primary" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">
            Bonjour, <span className="gradient-text">{displayName}</span> 👋
          </h1>
          <div className="mt-1.5 flex items-center gap-3">
            <p className="text-muted-foreground text-sm">Voici un résumé de votre activité</p>
            {myXp > 0 && <XPBadge xp={myXp} size="sm" showProgress />}
          </div>
        </div>
        <BookLessonDialog />
      </div>

      {/* Cours actif — banner prioritaire */}
      {activeLesson && <ActiveLessonBanner lesson={activeLesson} role="student" />}

      <div className="gradient-hero rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/10" />
        <div className="absolute top-4 right-4">
          <span className="xp-badge"><Zap className="h-3 w-3" /> NOUVEAU</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-bold font-display text-primary-foreground">
              Bienvenue sur <span className="gold-text">Prof en Ligne</span>
            </h2>
            <p className="text-primary-foreground/70 mt-2 max-w-lg text-sm">
              Réservez des cours avec les meilleurs tuteurs, utilisez l'IA pour vos devoirs et progressez chaque jour !
            </p>
            <div className="flex gap-3 mt-5">
              <Button asChild className="rounded-xl bg-primary-foreground/15 backdrop-blur border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25 transition-all">
                <Link to="/lessons" className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Mes cours</Link>
              </Button>
              <Button asChild className="rounded-xl bg-primary-foreground/15 backdrop-blur border border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/25 transition-all">
                <Link to="/ai-tutor" className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Tutor</Link>
              </Button>
            </div>
          </div>
          <div className="hidden md:block w-56 shrink-0 glass-hero p-4 rounded-xl">
            <p className="text-xs font-bold text-primary-foreground/80 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-gold" /> Progression
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-[10px] text-primary-foreground/60 mb-1">
                  <span>Cours complétés</span><span>{stats?.completedLessons || 0}</span>
                </div>
                <Progress value={Math.min((stats?.completedLessons || 0) * 10, 100)} className="h-1.5 bg-primary-foreground/10" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-primary-foreground/60 mb-1">
                  <span>Heures d'étude</span><span>{stats?.totalHours || 0}h</span>
                </div>
                <Progress value={Math.min(Number(stats?.totalHours || 0) * 5, 100)} className="h-1.5 bg-primary-foreground/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

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
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Prochains cours
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
              <Link to="/lessons" className="flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats?.upcomingLessons?.length && (
              <div className="py-8 text-center">
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Aucun cours à venir</p>
              </div>
            )}
            {stats?.upcomingLessons?.slice(0, 3).map((lesson, i) => (
              <div key={lesson.id} className="flex items-center justify-between rounded-xl border border-border/30 p-4 transition-all duration-200 hover:bg-secondary/50 hover:border-primary/20 group animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-xl shadow-md group-hover:scale-105 transition-transform">
                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{lesson.subject}</p>
                    <p className="text-sm text-muted-foreground">{lesson.topic || "—"} · {format(new Date(lesson.scheduled_at), "dd MMM à HH:mm", { locale: fr })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`rounded-full px-3 text-xs ${lesson.status === "confirmed" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30"}`} variant="outline">
                    {lesson.status === "confirmed" ? "Confirmé" : "En attente"}
                  </Badge>
                  {lesson.status === "confirmed" && (
                    <Button size="sm" className="rounded-xl gradient-primary text-primary-foreground btn-glow text-xs" asChild>
                      <Link to={`/room/${lesson.id}`}><Video className="mr-1 h-3 w-3" />Rejoindre</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Trouver un prof
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-primary hover:text-primary/80">
              <Link to="/tutors" className="flex items-center gap-1">Voir tout <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!tutors || tutors.length === 0) && (
              <div className="py-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Aucun tuteur inscrit</p>
              </div>
            )}
            {(tutors || []).filter((t: any) => t.status === "online").slice(0, 4).map((tutor: any, i: number) => {
              const initial = (tutor.profiles?.first_name?.[0] || "T").toUpperCase();
              const name = tutor.profiles?.first_name ? `${tutor.profiles.first_name} ${tutor.profiles.last_name || ""}` : "Tuteur";
              return (
                <Link key={tutor.id} to={`/tutors/${tutor.user_id}`} className="flex items-center gap-3 rounded-xl border border-border/30 p-3.5 transition-all duration-200 hover:bg-secondary/50 hover:border-primary/20 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{(tutor.subjects || []).join(", ") || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-semibold text-[hsl(var(--gold))]">
                    <Star className="h-3.5 w-3.5 fill-current" />{tutor.rating || "—"}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
