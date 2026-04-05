import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video, PhoneOff, Phone, PenLine, BookOpen, Copy, Check,
  Link as LinkIcon, ExternalLink, Loader2,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useJitsi } from "@/hooks/useJitsi";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Whiteboard } from "@/components/lessons/Whiteboard";
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
  const roomId = id || "default";

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [lessonInfo, setLessonInfo] = useState<LessonInfo | null>(null);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Display name from profile
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Participant";

  const handleReadyToClose = useCallback(() => {
    const subject = encodeURIComponent(lessonInfo?.subject || "Cours");
    const topic = encodeURIComponent(lessonInfo?.topic || "");
    navigate(`/report/${roomId}?subject=${subject}&topic=${topic}`);
  }, [lessonInfo, roomId, navigate]);

  const {
    containerRef, isLoading, error, isConnected, meetingLink,
    startMeeting, endMeeting,
  } = useJitsi({
    roomId,
    displayName,
    email: user?.email || undefined,
    onReadyToClose: handleReadyToClose,
  });

  // Vérifier que l'utilisateur est bien participant + récupérer les infos du cours
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("lessons")
      .select("student_id, tutor_id, subject, topic, status")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) logger.error("Lesson fetch error", err);
        if (!data || (data.student_id !== user.id && data.tutor_id !== user.id)) {
          toast.error("Vous n'avez pas accès à cette salle");
          navigate("/dashboard");
          setAuthorized(false);
        } else {
          setLessonInfo(data as LessonInfo);
          setAuthorized(true);
        }
      });
  }, [user, id, navigate]);

  // Send notification to the other participant when call starts
  useEffect(() => {
    if (!callStarted || !lessonInfo || !user) return;

    const otherUserId =
      lessonInfo.student_id === user.id ? lessonInfo.tutor_id : lessonInfo.student_id;

    // Insert a notification for the other participant
    supabase
      .from("notifications")
      .insert({
        user_id: otherUserId,
        title: "Cours en cours",
        message: `${displayName} vous attend dans la salle de cours (${lessonInfo.subject}). Cliquez pour rejoindre.`,
        type: "lesson",
        link: `/room/${roomId}`,
      })
      .then(({ error: err }) => {
        if (err) logger.warn("Failed to send notification", { error: String(err) });
      });
  }, [callStarted, lessonInfo, user, roomId, displayName]);

  const handleCopyLink = async () => {
    try {
      // Use the app's internal route as shareable link
      const appLink = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(appLink);
      setLinkCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const handleStartCall = async () => {
    setCallStarted(true);
    await startMeeting();
  };

  const handleEndCall = () => {
    endMeeting();
    setCallStarted(false);
    handleReadyToClose();
  };

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (authorized === false) return null;

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-4 animate-fade-in">
      {/* Zone vidéo principale */}
      <div className="flex flex-1 flex-col gap-4">

        {/* Bandeau info cours */}
        {lessonInfo && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-sm">{lessonInfo.subject}</span>
            {lessonInfo.topic && (
              <Badge variant="secondary" className="text-xs">{lessonInfo.topic}</Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              {callStarted && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopyLink}>
                  {linkCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {linkCopied ? "Copié" : "Copier le lien"}
                </Button>
              )}
              <span className="text-xs text-muted-foreground">Salle #{roomId.slice(0, 8)}</span>
            </div>
          </div>
        )}

        {/* Zone Jitsi / Pre-call */}
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-sidebar">
          {!callStarted ? (
            /* Pre-call screen */
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="gradient-primary flex h-20 w-20 items-center justify-center rounded-2xl">
                <Video className="h-10 w-10 text-primary-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-sidebar-foreground">
                  {lessonInfo?.subject || "Cours"}
                </p>
                {lessonInfo?.topic && (
                  <p className="text-sm text-sidebar-foreground/60 mt-1">{lessonInfo.topic}</p>
                )}
              </div>
              <p className="text-sm text-sidebar-foreground/50 max-w-sm text-center">
                Cliquez sur "Démarrer le cours" pour lancer la visio. L'autre participant recevra une notification.
              </p>
              <Button onClick={handleStartCall} className="gradient-primary text-primary-foreground" size="lg">
                <Phone className="mr-2 h-4 w-4" />
                Démarrer le cours
              </Button>
            </div>
          ) : (
            /* Jitsi iframe container */
            <>
              <div ref={containerRef} className="h-full w-full" />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-sidebar/80 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-sidebar-foreground/80">Connexion à la visio...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-sidebar/90">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" size="sm" onClick={handleStartCall}>
                        Réessayer
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={meetingLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-3 w-3" />
                          Ouvrir dans un nouvel onglet
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Connection status */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-sidebar/80 px-3 py-1.5 text-sm font-medium text-sidebar-foreground backdrop-blur pointer-events-none">
                <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
                {isConnected ? "Connecté" : "Connexion..."}
              </div>
            </>
          )}
        </div>

        {/* Contrôles en bas */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={whiteboardOpen ? "secondary" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => setWhiteboardOpen(!whiteboardOpen)}
            title="Tableau blanc"
          >
            <PenLine className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-12 gap-2 rounded-full px-4"
            onClick={handleCopyLink}
            disabled={!callStarted}
          >
            <LinkIcon className="h-4 w-4" />
            {linkCopied ? "Lien copié !" : "Partager le lien"}
          </Button>

          {callStarted && (
            <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleEndCall}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Panel whiteboard */}
      {whiteboardOpen && (
        <Card className="glass-card flex flex-col w-full lg:w-[520px] h-[400px] lg:h-auto shrink-0">
          <div className="border-b p-3">
            <h3 className="text-sm font-semibold">Tableau blanc collaboratif</h3>
          </div>
          <div className="flex-1 p-3 min-h-0">
            <Whiteboard roomId={roomId} />
          </div>
        </Card>
      )}
    </div>
  );
}
