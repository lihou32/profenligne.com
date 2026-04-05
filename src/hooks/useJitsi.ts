import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/lib/logger";

// ─── Types for Jitsi Meet External API ──────────────────
interface JitsiMeetExternalAPI {
  dispose: () => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
  addListener: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isAudioMuted: () => Promise<boolean>;
  isVideoMuted: () => Promise<boolean>;
}

interface JitsiMeetExternalAPIConstructor {
  new (domain: string, options: JitsiOptions): JitsiMeetExternalAPI;
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  width: string;
  height: string;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
  userInfo?: { displayName: string; email?: string };
  lang?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiMeetExternalAPIConstructor;
  }
}

// ─── Script loader (singleton) ──────────────────────────
let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  if (window.JitsiMeetExternalAPI) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Impossible de charger Jitsi Meet"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

// ─── Hook ───────────────────────────────────────────────
interface UseJitsiOptions {
  roomId: string;
  displayName: string;
  email?: string;
  onReadyToClose?: () => void;
}

export function useJitsi({ roomId, displayName, email, onReadyToClose }: UseJitsiOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiMeetExternalAPI | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  const startMeeting = useCallback(async () => {
    if (!containerRef.current) return;
    if (apiRef.current) return; // already started

    setIsLoading(true);
    setError(null);

    try {
      await loadJitsiScript();

      if (!window.JitsiMeetExternalAPI) {
        throw new Error("JitsiMeetExternalAPI non disponible");
      }

      // Unique room name scoped to profenligne
      const roomName = `profenligne-${roomId}`;

      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        lang: "fr",
        userInfo: {
          displayName,
          email: email || undefined,
        },
        configOverwrite: {
          // Disable pre-join page — go straight into the call
          prejoinPageEnabled: false,
          // Start with video and audio ON
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Disable lobby
          enableLobby: false,
          // Disable invite features (we handle invitations ourselves)
          disableInviteFunctions: true,
          // Disable "add people" dialog
          hideConferenceSubject: false,
          // Set subject
          subject: `Prof en Ligne — Cours`,
          // No password by default
          enableInsecureRoomNameWarning: false,
          // Disable deep linking (don't prompt to open in Jitsi app)
          disableDeepLinking: true,
          // Disable third-party requests
          disableThirdPartyRequests: true,
          // P2P for 2-person calls (better latency)
          p2p: { enabled: true },
          // No recording (free tier)
          enableRecording: false,
          // Disable reactions
          disableReactions: true,
          // Breakout rooms off
          hideConferenceTimer: false,
        },
        interfaceConfigOverwrite: {
          // Branding
          APP_NAME: "Prof en Ligne",
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: "#1a1625",
          // Toolbar buttons we want
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "chat",
            "raisehand",
            "tileview",
            "hangup",
            "settings",
          ],
          // Hide some UI elements
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false,
          // Film strip on right (like the current UI)
          FILM_STRIP_MAX_HEIGHT: 120,
          VERTICAL_FILMSTRIP: true,
        },
      });

      // Event listeners
      api.addListener("videoConferenceJoined", () => {
        setIsConnected(true);
        setIsLoading(false);
        logger.info("Jitsi: conference joined", { roomName });
      });

      api.addListener("videoConferenceLeft", () => {
        setIsConnected(false);
        onReadyToClose?.();
      });

      api.addListener("participantJoined", () => {
        setParticipantCount((prev) => prev + 1);
      });

      api.addListener("participantLeft", () => {
        setParticipantCount((prev) => Math.max(0, prev - 1));
      });

      api.addListener("readyToClose", () => {
        onReadyToClose?.();
      });

      apiRef.current = api;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement de la visio";
      setError(msg);
      setIsLoading(false);
      logger.error("Jitsi init error", err);
    }
  }, [roomId, displayName, email, onReadyToClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  const endMeeting = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.executeCommand("hangup");
      apiRef.current.dispose();
      apiRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    apiRef.current?.executeCommand("toggleAudio");
  }, []);

  const toggleVideo = useCallback(() => {
    apiRef.current?.executeCommand("toggleVideo");
  }, []);

  const toggleChat = useCallback(() => {
    apiRef.current?.executeCommand("toggleChat");
  }, []);

  const toggleScreenShare = useCallback(() => {
    apiRef.current?.executeCommand("toggleShareScreen");
  }, []);

  // Generate a shareable link for the room
  const meetingLink = `https://meet.jit.si/profenligne-${roomId}`;

  return {
    containerRef,
    isLoading,
    error,
    isConnected,
    participantCount,
    meetingLink,
    startMeeting,
    endMeeting,
    toggleAudio,
    toggleVideo,
    toggleChat,
    toggleScreenShare,
  };
}
