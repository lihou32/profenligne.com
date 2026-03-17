import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useWebRTC(roomId: string) {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politenessRef = useRef<"polite" | "impolite">("polite");

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remote = new MediaStream();
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      setRemoteStream(new MediaStream(remote.getTracks()));
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        await supabase.from("webrtc_signals").insert([{
          room_id: roomId,
          sender_id: user.id,
          signal_type: "ice-candidate",
          signal_data: event.candidate.toJSON() as any,
        }]);
      }
    };

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === "connected");
    };

    pcRef.current = pc;
    return pc;
  }, [roomId, user]);

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get media:", err);
      // Try audio only
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      } catch {
        console.error("No media available");
        return null;
      }
    }
  }, []);

  const startCall = useCallback(async () => {
    const stream = await startLocalStream();
    const pc = createPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Determine politeness by alphabetical order of user IDs
    politenessRef.current = "polite";

    // Create offer
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (user) {
        await supabase.from("webrtc_signals").insert([{
          room_id: roomId,
          sender_id: user.id,
          signal_type: "offer",
          signal_data: { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type } as any,
        }]);
      }
    } finally {
      makingOfferRef.current = false;
    }
  }, [startLocalStream, createPeerConnection, roomId, user]);

  const joinCall = useCallback(async () => {
    const stream = await startLocalStream();
    const pc = createPeerConnection();

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    politenessRef.current = "impolite";

    // Fetch existing offer
    const { data: offers } = await supabase
      .from("webrtc_signals")
      .select("*")
      .eq("room_id", roomId)
      .eq("signal_type", "offer")
      .order("created_at", { ascending: false })
      .limit(1);

    if (offers && offers.length > 0) {
      const offer = offers[0];
      await pc.setRemoteDescription(new RTCSessionDescription(offer.signal_data as unknown as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (user) {
        await supabase.from("webrtc_signals").insert([{
          room_id: roomId,
          sender_id: user.id,
          signal_type: "answer",
          signal_data: { sdp: pc.localDescription?.sdp, type: pc.localDescription?.type } as any,
        }]);
      }

      // Process existing ICE candidates
      const { data: candidates } = await supabase
        .from("webrtc_signals")
        .select("*")
        .eq("room_id", roomId)
        .eq("signal_type", "ice-candidate")
        .neq("sender_id", user?.id ?? "");

      if (candidates) {
        for (const c of candidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c.signal_data as unknown as RTCIceCandidateInit));
          } catch (e) {
            console.warn("Failed to add ICE candidate:", e);
          }
        }
      }
    }
  }, [startLocalStream, createPeerConnection, roomId, user]);

  // Listen for signals via realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`signals-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signals",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.sender_id === user.id) return;

          const pc = pcRef.current;
          if (!pc) return;

          if (signal.signal_type === "answer") {
            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(signal.signal_data)
              );
            } catch (e) {
              console.warn("Failed to set remote description:", e);
            }
          } else if (signal.signal_type === "ice-candidate") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
            } catch (e) {
              console.warn("Failed to add ICE candidate:", e);
            }
          } else if (signal.signal_type === "offer") {
            // Handle renegotiation
            if (!ignoreOfferRef.current) {
              try {
                await pc.setRemoteDescription(
                  new RTCSessionDescription(signal.signal_data)
                );
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await supabase.from("webrtc_signals").insert([{
                  room_id: roomId,
                  sender_id: user.id,
                  signal_type: "answer",
                  signal_data: {
                    sdp: pc.localDescription?.sdp,
                    type: pc.localDescription?.type,
                  } as any,
                }]);
              } catch (e) {
                console.warn("Failed to handle offer:", e);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  const toggleVideo = useCallback((on: boolean) => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = on));
  }, []);

  const toggleAudio = useCallback((on: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(screen);

      const pc = pcRef.current;
      if (pc) {
        const videoTrack = screen.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (e) {
      console.error("Screen share failed:", e);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);

    const pc = pcRef.current;
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (pc && videoTrack) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(videoTrack);
    }
  }, [screenStream]);

  const endCall = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsConnected(false);
  }, [screenStream]);

  return {
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
  };
}
