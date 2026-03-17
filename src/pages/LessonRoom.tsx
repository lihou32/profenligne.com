import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageCircle,
  Send,
  Phone,
  PenLine,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Whiteboard } from "@/components/lessons/Whiteboard";

export default function LessonRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomId = id || "default";
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const {
    localStream,
    remoteStream,
    isConnected,
    screenStream,
    startCall,
    joinCall,
    endCall,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(roomId);

  const { messages: chatMessages, sendMessage } = useRoomChat(roomId);

  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [callStarted, setCallStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Verify user is a participant of this lesson
  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("lessons")
      .select("student_id, tutor_id")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || (data.student_id !== user.id && data.tutor_id !== user.id)) {
          toast.error("Vous n'avez pas accès à cette salle");
          navigate("/dashboard");
          setAuthorized(false);
        } else {
          setAuthorized(true);
        }
      });
  }, [user, id, navigate]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = screenStream || localStream;
    }
  }, [localStream, screenStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  if (authorized === null) {
    return <div className="flex items-center justify-center min-h-[60vh]"><span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (authorized === false) return null;

  const handleStartCall = async () => {
    setCallStarted(true);
    try {
      await startCall();
      toast.success("Appel démarré — en attente du participant");
    } catch {
      toast.error("Impossible de démarrer l'appel");
    }
  };

  const handleJoinCall = async () => {
    setCallStarted(true);
    try {
      await joinCall();
      toast.success("Connexion à l'appel...");
    } catch {
      toast.error("Impossible de rejoindre l'appel");
    }
  };

  const handleEndCall = async () => {
    endCall();
    setCallStarted(false);
    // Fetch lesson data for the report redirect
    const { data: lesson } = await supabase
      .from("lessons")
      .select("subject, topic")
      .eq("id", id!)
      .maybeSingle();
    const subject = encodeURIComponent(lesson?.subject || "Cours");
    const topic = encodeURIComponent(lesson?.topic || "");
    navigate(`/report/${roomId}?subject=${subject}&topic=${topic}`);
  };

  const handleToggleVideo = () => {
    const next = !videoOn;
    setVideoOn(next);
    toggleVideo(next);
  };

  const handleToggleAudio = () => {
    const next = !micOn;
    setMicOn(next);
    toggleAudio(next);
  };

  const handleScreenShare = () => {
    if (screenStream) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    await sendMessage(chatInput);
    setChatInput("");
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in">
      {/* Main video area */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="relative flex-1 overflow-hidden rounded-2xl bg-sidebar">
          {!callStarted ? (
            /* Pre-call screen */
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Video className="h-16 w-16 text-sidebar-foreground/30" />
              <p className="text-lg font-medium text-sidebar-foreground">
                Salle de cours #{roomId}
              </p>
              <div className="flex gap-3">
                <Button onClick={handleStartCall} className="gradient-primary text-primary-foreground">
                  <Phone className="mr-2 h-4 w-4" />
                  Démarrer l'appel
                </Button>
                <Button variant="outline" onClick={handleJoinCall}>
                  <Phone className="mr-2 h-4 w-4" />
                  Rejoindre
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-sidebar-foreground">
                    <Video className="mx-auto mb-2 h-12 w-12 opacity-30" />
                    <p className="text-sm opacity-60">En attente du participant...</p>
                  </div>
                </div>
              )}

              {/* Local video (PiP) */}
              <div className="absolute bottom-4 right-4 h-32 w-44 overflow-hidden rounded-xl border-2 border-background/50 bg-sidebar/80 backdrop-blur">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Connection status */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-sidebar/80 px-3 py-1.5 text-sm font-medium text-sidebar-foreground backdrop-blur">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                  }`}
                />
                {isConnected ? "Connecté" : "En attente..."}
              </div>
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={micOn ? "outline" : "destructive"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleToggleAudio}
            disabled={!callStarted}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button
            variant={videoOn ? "outline" : "destructive"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleToggleVideo}
            disabled={!callStarted}
          >
            {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button
            variant={screenStream ? "secondary" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleScreenShare}
            disabled={!callStarted}
          >
            {screenStream ? (
              <MonitorOff className="h-5 w-5" />
            ) : (
              <Monitor className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={whiteboardOpen ? "secondary" : "outline"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => {
              setWhiteboardOpen(!whiteboardOpen);
              if (chatOpen) setChatOpen(false);
            }}
            title="Tableau blanc"
          >
            <PenLine className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={() => {
              setChatOpen(!chatOpen);
              if (whiteboardOpen) setWhiteboardOpen(false);
            }}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={handleEndCall}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <Card className="glass-card flex w-80 flex-col">
          <div className="border-b p-3">
            <h3 className="text-sm font-semibold">Chat du cours</h3>
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-3">
            {chatMessages.map((msg) => (
              <div key={msg.id}>
                <p className="text-xs font-medium">
                  {msg.user_id === user?.id ? "Vous" : msg.sender_name}{" "}
                  <span className="text-muted-foreground">
                    {formatTime(msg.created_at)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{msg.content}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t p-3">
            <form onSubmit={handleSendChat} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Message..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Whiteboard panel */}
      {whiteboardOpen && (
        <Card className="glass-card flex flex-col" style={{ width: "520px" }}>
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
