import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Star, Euro, BookOpen, Trophy, Filter, ChevronRight,
  Wifi, Users, Medal,
} from "lucide-react";
import { XPBadge, getBadge } from "@/components/gamification/XPBadge";

const ALL_SUBJECTS = [
  "Mathématiques", "Physique", "Chimie", "Anglais", "Français",
  "Histoire", "Géographie", "SVT", "Informatique", "Philosophie",
];

const statusConfig: Record<string, { dot: string; label: string }> = {
  online:    { dot: "bg-[hsl(var(--success))]",   label: "Disponible" },
  busy:      { dot: "bg-[hsl(var(--warning))]",   label: "Occupé" },
  offline:   { dot: "bg-muted-foreground/40",      label: "Hors ligne" },
  suspended: { dot: "bg-destructive",              label: "Suspendu" },
};

// ─── Tutor card ───────────────────────────────────────────────────────────────

function TutorCard({ tutor, xp }: { tutor: any; xp: number }) {
  const navigate = useNavigate();
  const profile = tutor.profiles;
  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Professeur";
  const initials = profile
    ? `${(profile.first_name?.[0] || "P").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}`
    : "P";
  const status = statusConfig[tutor.status] ?? statusConfig.offline;
  const badge = getBadge(xp);

  const avgRating = Number(tutor.rating) || 0;

  return (
    <Card
      className="glass-card group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_hsl(var(--primary)/0.2)] hover:border-primary/30"
      onClick={() => navigate(`/tutors/${tutor.user_id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Avatar className="h-14 w-14 ring-2 ring-border group-hover:ring-primary/50 transition-all">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
              <AvatarFallback className="gradient-primary text-primary-foreground font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card ${status.dot}`}
              title={status.label}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{fullName || "Professeur"}</h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${i <= Math.round(avgRating) ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" : "text-muted-foreground/20"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {avgRating.toFixed(1)} · {tutor.total_reviews ?? 0} avis
              </span>
            </div>

            {/* XP Badge */}
            <div className="mt-1.5">
              <XPBadge xp={xp} size="sm" showLabel />
            </div>

            {/* Subjects */}
            <div className="mt-2 flex flex-wrap gap-1">
              {(tutor.subjects || []).slice(0, 3).map((s: string) => (
                <Badge key={s} variant="secondary" className="rounded-full text-[10px] px-2 py-0">
                  {s}
                </Badge>
              ))}
              {(tutor.subjects || []).length > 3 && (
                <Badge variant="outline" className="rounded-full text-[10px] px-2 py-0 text-muted-foreground">
                  +{(tutor.subjects || []).length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Euro className="h-3.5 w-3.5 text-primary" />
            {tutor.hourly_rate ? `${tutor.hourly_rate}€/h` : "Tarif à définir"}
          </span>
          <span className={`text-xs font-medium flex items-center gap-1`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────

function LeaderboardRow({ tutor, rank, xp }: { tutor: any; rank: number; xp: number }) {
  const navigate = useNavigate();
  const profile = tutor.profiles;
  const fullName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Professeur";
  const initials = profile
    ? `${(profile.first_name?.[0] || "P").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}`
    : "P";

  const rankIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <div
      className="flex items-center gap-4 rounded-xl p-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate(`/tutors/${tutor.user_id}`)}
    >
      <div className="w-8 text-center text-sm font-bold text-muted-foreground">
        {rankIcon ?? `#${rank}`}
      </div>
      <Avatar className="h-10 w-10">
        {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={fullName} />}
        <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{fullName}</p>
        <p className="text-xs text-muted-foreground">{(tutor.subjects || []).slice(0, 2).join(", ")}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <XPBadge xp={xp} size="sm" showLabel={false} />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className={`h-2.5 w-2.5 ${i <= Math.round(Number(tutor.rating) || 0) ? "fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" : "text-muted-foreground/20"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Tutors() {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");
  const [maxPrice, setMaxPrice] = useState(200);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<"rating" | "price_asc" | "price_desc" | "xp">("rating");

  // Fetch tutors with profiles
  const { data: tutors = [], isLoading } = useQuery({
    queryKey: ["tutors-search"],
    queryFn: async () => {
      const { data: t, error } = await supabase.from("tutors").select("*");
      if (error) throw error;

      const userIds = [...new Set((t || []).map((x) => x.user_id))];
      if (!userIds.length) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url, bio")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return (t || []).map((x) => ({ ...x, profiles: profileMap.get(x.user_id) ?? null }));
    },
  });

  // Fetch XP for all tutors
  const { data: xpData = [] } = useQuery({
    queryKey: ["all-user-xp"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_xp").select("user_id, total_xp");
      if (error) throw error;
      return data ?? [];
    },
  });

  const xpMap = useMemo(() => {
    const m = new Map<string, number>();
    xpData.forEach((x) => m.set(x.user_id, x.total_xp));
    return m;
  }, [xpData]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = tutors.filter((t) => {
      const profile = t.profiles;
      const name = `${profile?.first_name || ""} ${profile?.last_name || ""}`.toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (subject !== "all" && !(t.subjects || []).includes(subject)) return false;
      if (t.hourly_rate && Number(t.hourly_rate) > maxPrice) return false;
      if (minRating > 0 && (Number(t.rating) || 0) < minRating) return false;
      if (t.status === "suspended") return false;
      return true;
    });

    if (sortBy === "rating") result = result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sortBy === "price_asc") result = result.sort((a, b) => (Number(a.hourly_rate) || 999) - (Number(b.hourly_rate) || 999));
    else if (sortBy === "price_desc") result = result.sort((a, b) => (Number(b.hourly_rate) || 0) - (Number(a.hourly_rate) || 0));
    else if (sortBy === "xp") result = result.sort((a, b) => (xpMap.get(b.user_id) || 0) - (xpMap.get(a.user_id) || 0));

    return result;
  }, [tutors, search, subject, maxPrice, minRating, sortBy, xpMap]);

  // Leaderboard: top tutors by XP
  const leaderboard = useMemo(() => {
    return [...tutors]
      .filter((t) => t.status !== "suspended")
      .sort((a, b) => (xpMap.get(b.user_id) || 0) - (xpMap.get(a.user_id) || 0))
      .slice(0, 10);
  }, [tutors, xpMap]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-display flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          Trouver un Professeur
        </h1>
        <p className="mt-1 text-muted-foreground">
          {tutors.length} professeur{tutors.length !== 1 ? "s" : ""} disponible{tutors.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Tabs defaultValue="search">
        <TabsList className="mb-4">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" /> Recherche
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="h-4 w-4" /> Classement XP
          </TabsTrigger>
        </TabsList>

        {/* ── Search tab ──────────────────────────────────────────────────── */}
        <TabsContent value="search" className="space-y-4">
          {/* Filter bar */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Search */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Search className="h-3 w-3" /> Nom
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Subject filter */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Matière
                  </Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les matières</SelectItem>
                      {ALL_SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1"><Euro className="h-3 w-3" /> Tarif max</span>
                    <span className="font-medium text-foreground">{maxPrice}€/h</span>
                  </Label>
                  <Slider
                    value={[maxPrice]}
                    onValueChange={([v]) => setMaxPrice(v)}
                    min={5} max={200} step={5}
                  />
                </div>

                {/* Rating + sort */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Trier par
                  </Label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating">⭐ Meilleures notes</SelectItem>
                      <SelectItem value="xp">🏆 Plus d'XP</SelectItem>
                      <SelectItem value="price_asc">💶 Prix croissant</SelectItem>
                      <SelectItem value="price_desc">💶 Prix décroissant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Min rating filter */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Label className="text-xs text-muted-foreground">Note minimum :</Label>
                {[0, 3, 4, 4.5].map((r) => (
                  <Button
                    key={r}
                    variant={minRating === r ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs rounded-full px-3"
                    onClick={() => setMinRating(r)}
                  >
                    {r === 0 ? "Tous" : `${r}+ ★`}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Aucun professeur trouvé</p>
              <p className="text-sm">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tutor) => (
                <TutorCard key={tutor.id} tutor={tutor} xp={xpMap.get(tutor.user_id) || 0} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Leaderboard tab ──────────────────────────────────────────────── */}
        <TabsContent value="leaderboard">
          <Card className="glass-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-[hsl(var(--gold))]" />
                <h2 className="font-semibold">Classement des meilleurs professeurs</h2>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun classement disponible pour le moment.
                </p>
              ) : (
                leaderboard.map((tutor, i) => (
                  <LeaderboardRow
                    key={tutor.id}
                    tutor={tutor}
                    rank={i + 1}
                    xp={xpMap.get(tutor.user_id) || 0}
                  />
                ))
              )}

              <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border/30">
                Le classement est basé sur les points XP accumulés au fil des cours
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
