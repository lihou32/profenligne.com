import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Users, ChevronDown, Wifi, WifiOff, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface TutorWithProfile {
  id: string;
  user_id: string;
  status: string;
  hourly_rate: number | null;
  rating: number | null;
  total_reviews: number | null;
  subjects: string[];
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

function useAdminTutors() {
  return useQuery({
    queryKey: ["admin-tutors"],
    queryFn: async () => {
      const { data: tutors, error } = await supabase
        .from("tutors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((tutors || []).map((t) => t.user_id))];
      if (userIds.length === 0) return [] as TutorWithProfile[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return (tutors || []).map((t) => ({
        ...t,
        profiles: profileMap.get(t.user_id) || null,
      })) as TutorWithProfile[];
    },
  });
}

function useUpdateTutorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tutorId, status }: { tutorId: string; status: string }) => {
      const { error } = await supabase
        .from("tutors")
        .update({ status })
        .eq("id", tutorId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["admin-tutors"] });
      const labels: Record<string, string> = {
        online: "En ligne",
        offline: "Hors ligne",
        busy: "Occupé",
        suspended: "Suspendu",
      };
      toast.success(`Statut mis à jour : ${labels[status] ?? status}`);
    },
    onError: () => {
      toast.error("Impossible de mettre à jour le statut");
    },
  });
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  online:    { label: "En ligne",   variant: "default",     icon: Wifi },
  offline:   { label: "Hors ligne", variant: "secondary",   icon: WifiOff },
  busy:      { label: "Occupé",     variant: "destructive", icon: Clock },
  suspended: { label: "Suspendu",   variant: "outline",     icon: WifiOff },
};

const allStatuses = ["online", "offline", "busy", "suspended"] as const;

export function AdminTutorsTab() {
  const { data: tutors, isLoading } = useAdminTutors();
  const { mutate: updateStatus, isPending } = useUpdateTutorStatus();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!tutors || tutors.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun tuteur enregistré pour le moment
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Liste des tuteurs
          <Badge variant="secondary" className="ml-1">{tutors.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="p-4">Tuteur</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Tarif / h</th>
                <th className="p-4">Note</th>
                <th className="p-4">Avis</th>
                <th className="p-4">Matières</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tutors.map((tutor) => {
                const fullName =
                  [tutor.profiles?.first_name, tutor.profiles?.last_name]
                    .filter(Boolean)
                    .join(" ") || "Nom inconnu";
                const initials = fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const status = statusConfig[tutor.status] ?? {
                  label: tutor.status,
                  variant: "outline" as const,
                  icon: WifiOff,
                };
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={tutor.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    {/* Tuteur */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={tutor.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{fullName}</span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="p-4">
                      <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </td>

                    {/* Tarif */}
                    <td className="p-4 text-sm">
                      {tutor.hourly_rate != null
                        ? `${Number(tutor.hourly_rate).toFixed(0)} €`
                        : "—"}
                    </td>

                    {/* Note */}
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                        <span>
                          {tutor.rating != null ? Number(tutor.rating).toFixed(1) : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Avis */}
                    <td className="p-4 text-sm text-muted-foreground">
                      {tutor.total_reviews ?? 0} avis
                    </td>

                    {/* Matières */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(tutor.subjects || []).slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-xs px-1.5 py-0">
                            {s}
                          </Badge>
                        ))}
                        {(tutor.subjects || []).length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            +{tutor.subjects.length - 3}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={isPending}
                          >
                            Modifier statut
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {allStatuses
                            .filter((s) => s !== tutor.status)
                            .map((s) => {
                              const cfg = statusConfig[s];
                              const Icon = cfg.icon;
                              return (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() =>
                                    updateStatus({ tutorId: tutor.id, status: s })
                                  }
                                  className="flex items-center gap-2 text-sm cursor-pointer"
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {cfg.label}
                                </DropdownMenuItem>
                              );
                            })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
