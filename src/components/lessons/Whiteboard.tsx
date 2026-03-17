import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Pen, Trash2, Wifi, WifiOff } from "lucide-react";
import { useWhiteboard, DrawingTool } from "@/hooks/useWhiteboard";
import { cn } from "@/lib/utils";

const COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#c084fc", "#f472b6",
  "#000000",
];

interface WhiteboardProps {
  roomId: string;
}

export function Whiteboard({ roomId }: WhiteboardProps) {
  const [color, setColor] = useState("#ffffff");
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<DrawingTool>("pen");
  const containerRef = useRef<HTMLDivElement>(null);

  const { canvasRef, startDrawing, draw, stopDrawing, clearCanvas, isConnected } = useWhiteboard({
    roomId,
    color,
    lineWidth,
    tool,
  });

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const observer = new ResizeObserver(() => {
      // Snapshot current drawing
      const imageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      if (imageData) {
        canvas.getContext("2d")?.putImageData(imageData, 0, 0);
      }
    });

    observer.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        {/* Tool selector */}
        <div className="flex gap-1">
          <Button
            size="icon"
            variant={tool === "pen" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => setTool("pen")}
            title="Stylo"
          >
            <Pen className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant={tool === "eraser" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => setTool("eraser")}
            title="Gomme"
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Color palette */}
        <div className="flex flex-wrap gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => { setColor(c); setTool("pen"); }}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                color === c && tool === "pen" ? "border-primary scale-110" : "border-border"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Line width */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Épaisseur</span>
          <Slider
            value={[lineWidth]}
            onValueChange={([v]) => setLineWidth(v)}
            min={1}
            max={20}
            step={1}
            className="w-20"
          />
          <span className="text-xs text-muted-foreground w-4">{lineWidth}</span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Clear */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={clearCanvas}
          title="Effacer tout"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        {/* Connection indicator */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {isConnected ? (
            <><Wifi className="h-3 w-3 text-green-500" /><span className="text-green-500">Sync</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-yellow-500" /><span className="text-yellow-500">Connexion…</span></>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-xl border border-border bg-[#1a1a2e]"
        style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {/* Hint */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/40 select-none">
          Tableau blanc collaboratif • Les modifications sont visibles en temps réel
        </div>
      </div>
    </div>
  );
}
