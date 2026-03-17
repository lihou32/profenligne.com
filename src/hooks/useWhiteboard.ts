import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DrawingTool = "pen" | "eraser";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: DrawingTool;
}

interface WhiteboardEvent {
  type: "stroke" | "clear";
  stroke?: Stroke;
  userId: string;
}

interface UseWhiteboardOptions {
  roomId: string;
  color: string;
  lineWidth: number;
  tool: DrawingTool;
}

export function useWhiteboard({ roomId, color, lineWidth, tool }: UseWhiteboardOptions) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Point[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // Draw a single stroke progressively (for live drawing)
  const drawStrokeSegment = useCallback((points: Point[], strokeColor: string, width: number, strokeTool: DrawingTool) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = strokeTool === "eraser" ? "#ffffff" : strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = strokeTool === "eraser" ? "destination-out" : "source-over";
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const broadcastEvent = useCallback((event: WhiteboardEvent) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "whiteboard",
      payload: event,
    });
  }, []);

  // Get canvas-relative coordinates
  const getPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;
    isDrawingRef.current = true;
    currentStrokeRef.current = [point];
  }, [getPoint]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const point = getPoint(e);
    if (!point) return;

    currentStrokeRef.current.push(point);
    drawStrokeSegment(currentStrokeRef.current, color, lineWidth, tool);

    // Broadcast the latest segment for real-time sync
    broadcastEvent({
      type: "stroke",
      stroke: {
        id: "live-" + user?.id,
        points: currentStrokeRef.current.slice(-2),
        color,
        width: lineWidth,
        tool,
      },
      userId: user?.id ?? "",
    });
  }, [getPoint, drawStrokeSegment, color, lineWidth, tool, broadcastEvent, user]);

  const stopDrawing = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    e?.preventDefault();
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokeRef.current.length > 1) {
      const stroke: Stroke = {
        id: crypto.randomUUID(),
        points: [...currentStrokeRef.current],
        color,
        width: lineWidth,
        tool,
      };
      strokesRef.current.push(stroke);

      // Broadcast the complete stroke
      broadcastEvent({
        type: "stroke",
        stroke,
        userId: user?.id ?? "",
      });
    }
    currentStrokeRef.current = [];
  }, [color, lineWidth, tool, broadcastEvent, user]);

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    redrawCanvas();
    broadcastEvent({ type: "clear", userId: user?.id ?? "" });
  }, [redrawCanvas, broadcastEvent, user]);

  // Setup Realtime channel
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`whiteboard-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "whiteboard" }, ({ payload }: { payload: WhiteboardEvent }) => {
        if (payload.userId === user.id) return;

        if (payload.type === "clear") {
          strokesRef.current = [];
          redrawCanvas();
        } else if (payload.type === "stroke" && payload.stroke) {
          const incoming = payload.stroke;

          if (incoming.id.startsWith("live-")) {
            // Progressive draw from remote peer
            drawStrokeSegment(incoming.points, incoming.color, incoming.width, incoming.tool);
          } else {
            // Complete stroke — store and redraw
            const existing = strokesRef.current.find((s) => s.id === incoming.id);
            if (!existing) {
              strokesRef.current.push(incoming);
            }
            redrawCanvas();
          }
        }
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, user, redrawCanvas, drawStrokeSegment]);

  return {
    canvasRef,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    isConnected,
  };
}
