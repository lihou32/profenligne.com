import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Clock, Video, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface AdminLesson {
  id: string;
  subject: string;
  topic: string | null;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  student_id: string;
  tutor_id: string;
  student_profile?: { first_name: string | null; last_name: string | null } | null;
  tutor_profile?: { first_name: string | null; last_name: string | null } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  pending:     { label: "En attente", variant: "secondary",   className: "bg-warning/15 text-warning border-warning/30" },
  confirmed:   { label: "Confirmé",   variant: "default",     className: "bg-info/15 text-info border-info/30" },
  in_progress: { label: "En cours",   variant: "default",     className: "bg-primary/15 text-primary border-primary/30" },
  completed:   { label: "Terminé",    variant: "outline",     className: "bg-success/15 text-success border-success/30" },
  cancelled:   { label: "Annulé",     variant: "destructive", className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30" },
};

const allStatuses = ["all", "pending", "confirmed", "in_progress", "completed", "cancelled"] as const;

function useAdminLessons(statusFilter: string) {
  return useQuery({
    queryKey: ["admin-lessons", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("lessons")
        .select("*")
        .order("scheduled_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: lessons, error } = await query;
      if (error) throw error;

      if (!lessons || lessons.length === 0) return [] as AdminLesson[];

      const userIds = [
        ...new Set([
          ...lessons.map((l) => l.student_id),
          ...lessons.map((l) => l.tutor_id),
        ]),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return lessons.map((l) => ({
        ...l,
        student_profile: profileMap.get(l.student_id) || null,
        tutor_profile: profileMap.get(l.tutor_id) || null,
      })) as AdminLesson[];
    },
  });
}

function useAdminUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("lessons").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      toast.success("Statut du cours mis à jour");
    },
    onError: () => toast.error("Impossible de mettre à jour le cours"),
  });
}

export function AdminLessonsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: lessons, isLoading } = useAdminLessons(statusFilter);
  const { mutate: updateLesson, isPending } = useAdminUpdateLesson();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Liste des cours
            <Badge variant="secondary" className="ml-1">{lessons?.length ?? 0}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!lessons || lessons.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Aucun cours trouvé</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="p-4">Cours</th>
                  <th className="p-4">Élève</th>
                  <th className="p-4">Tuteur</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Durée</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => {
                  const cfg = statusConfig[lesson.status] ?? statusConfig.pending;
                  const studentName = [lesson.student_profile?.first_name, lesson.student_profile?.last_name].filter(Boolean).join(" ") || "Élève";
                  const tutorName = [lesson.tutor_profile?.first_name, lesson.tutor_profile?.last_name].filter(Boolean).join(" ") || "Tuteur";
                  const durationLabel = lesson.duration_minutes >= 60
                    ? `${Math.floor(lesson.duration_minutes / 60)}h${lesson.duration_minutes % 60 ? lesson.duration_minutes % 60 + "min" : ""}`
                    : `${lesson.duration_minutes}min`;

                  return (
                    <tr key={lesson.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      {/* Cours */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="gradient-primary flex h-8 w-8 items-center justify-center rounded-lg shrink-0">
                            <BookOpen className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lesson.subject}</p>
                            {lesson.topic && <p className="text-xs text-muted-foreground">{lesson.topic}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Élève */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {studentName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{studentName}</span>
                        </div>
                      </td>

                      {/* Tuteur */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {tutorName[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{tutorName}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4">
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(new Date(lesson.scheduled_at), "dd MMM yyyy", { locale: fr })}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                            <Clock className="h-3 w-3" />
                            {format(new Date(lesson.scheduled_at), "HH:mm")}
                          </div>
                        </div>
                      </td>

                      {/* Durée */}
                      <td className="p-4 text-sm text-muted-foreground">{durationLabel}</td>

                      {/* Statut */}
                      <td className="p-4">
                        <Badge className={`rounded-full px-2.5 text-xs ${cfg.className}`} variant="outline">
                          {cfg.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {(lesson.status === "confirmed" || lesson.status === "in_progress") && (
                            <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1" asChild>
                              <Link to={`/room/${lesson.id}`}>
                                <Video className="h-3 w-3" /> Voir
                              </Link>
                            </Button>
                          )}
                          {lesson.status === "pending" && (
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2 gradient-primary text-primary-foreground"
                              disabled={isPending}
                              onClick={() => updateLesson({ id: lesson.id, status: "confirmed" })}
                            >
                              Confirmer
                            </Button>
                          )}
                          {(lesson.status === "pending" || lesson.status === "confirmed") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                              disabled={isPending}
                              onClick={() => updateLesson({ id: lesson.id, status: "cancelled" })}
                            >
                              Annuler
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
