import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoomView } from "@/components/room/RoomView";
import { useAuth } from "@/hooks/useAuth";
import { useCompleteLesson, useStartLesson } from "@/hooks/useData";
import { useRoomTransport } from "@/hooks/useLessonRoom";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/credits";
import { logger } from "@/lib/logger";

interface LessonInfo {
  subject: string;
  topic: string | null;
  student_id: string;
  tutor_id: string;
  status: string;
}

export default function LessonRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [lessonInfo, setLessonInfo] = useState<LessonInfo | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const startLesson = useStartLesson();
  const completeLesson = useCompleteLesson();
  const isTutor = !!lessonInfo && lessonInfo.tutor_id === user?.id;
  const selfName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Participant";

  // Vérifier que l'utilisateur participe au cours + infos du cours
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("lessons")
      .select("student_id, tutor_id, subject, topic, status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) logger.error("Lesson fetch error", error);
        if (!data || (data.student_id !== user.id && data.tutor_id !== user.id)) {
          toast.error("Vous n'avez pas accès à cette salle");
          navigate("/dashboard");
          return;
        }
        if (data.status === "completed") {
          navigate(`/report/${id}`, { replace: true });
          return;
        }
        if (data.status === "cancelled") {
          toast.error("Ce cours a été annulé");
          navigate("/lessons", { replace: true });
          return;
        }
        setLessonInfo(data);
        supabase
          .from("profiles")
          .select("user_id, first_name")
          .in("user_id", [data.student_id, data.tutor_id])
          .then(({ data: people }) => {
            const map: Record<string, string> = {};
            people?.forEach((p) => {
              if (p.first_name) map[p.user_id] = p.first_name;
            });
            setNames(map);
          });
      });
  }, [user, id, navigate]);

  // Le canal privé n'est ouvert qu'une fois l'accès vérifié
  const { transport } = useRoomTransport(lessonInfo ? id : undefined, user?.id);

  const beforeJoin = async () => {
    if (!id || !lessonInfo) return false;
    if (lessonInfo.status === "in_progress") return true;
    try {
      const updated = await startLesson.mutateAsync(id);
      setLessonInfo((prev) => (prev ? { ...prev, status: updated.status } : prev));
      return true;
    } catch (e) {
      toast.error(friendlyError(e, "Impossible de démarrer le cours"));
      return false;
    }
  };

  const onLeave = () => {
    if (isTutor) setEndDialogOpen(true);
    else navigate("/lessons");
  };

  const handleCompleteLesson = async () => {
    if (!id) return;
    try {
      await completeLesson.mutateAsync(id);
      toast.success("Cours terminé ! Vos gains ont été crédités.");
      navigate(`/report/${id}`);
    } catch (e) {
      toast.error(friendlyError(e, "Impossible de terminer le cours"));
    }
  };

  if (!lessonInfo || !user || !id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const peerId = isTutor ? lessonInfo.student_id : lessonInfo.tutor_id;
  const peerLabel = names[peerId] ?? (isTutor ? "Votre élève" : "Votre prof");
  const started = lessonInfo.status === "in_progress";

  return (
    <>
      <RoomView
        key={id}
        lessonId={id}
        userId={user.id}
        selfName={selfName}
        peerLabel={peerLabel}
        names={names}
        title={lessonInfo.subject}
        subtitle={lessonInfo.topic}
        transport={transport}
        joinLabel={started ? "Rejoindre le cours" : "Démarrer le cours"}
        helper={
          started
            ? "Le cours a commencé. Vérifiez votre caméra et votre micro, puis entrez."
            : `Vérifiez votre caméra et votre micro. En entrant, ${peerLabel} est prévenu.`
        }
        beforeJoin={beforeJoin}
        onLeave={onLeave}
        preJoinExtra={
          isTutor && started ? (
            <Button variant="outline" size="lg" onClick={() => setEndDialogOpen(true)}>
              Terminer le cours
            </Button>
          ) : null
        }
      />

      <AlertDialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminer le cours ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le cours sera marqué comme terminé : vos gains sont crédités, l'élève reçoit son certificat
              et peut laisser un avis. Si vous avez simplement perdu la connexion, choisissez « Pas encore ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Pas encore</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteLesson} disabled={completeLesson.isPending}>
              Terminer le cours
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
