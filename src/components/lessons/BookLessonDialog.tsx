import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateLesson, useTutors } from "@/hooks/useData";
import { toast } from "sonner";
import { SUBJECTS } from "@/lib/constants";

interface BookLessonDialogProps {
  defaultTutorId?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function BookLessonDialog({ defaultTutorId, defaultOpen = false, onClose, trigger }: BookLessonDialogProps = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [tutorId, setTutorId] = useState(defaultTutorId || "");

  const { user } = useAuth();
  const createLesson = useCreateLesson();
  const { data: tutors } = useTutors();

  // Sync if defaultTutorId changes (e.g. different tutor clicked)
  useEffect(() => {
    if (defaultTutorId) setTutorId(defaultTutorId);
  }, [defaultTutorId]);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !date || !time || !tutorId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (scheduledAt <= new Date()) {
      toast.error("La date et l'heure doivent être dans le futur");
      return;
    }
    try {
      await createLesson.mutateAsync({
        student_id: user.id,
        tutor_id: tutorId,
        subject,
        topic: topic || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        status: "pending",
      });
      toast.success("Cours réservé avec succès !");
      setOpen(false);
      onClose?.();
      setSubject("");
      setTopic("");
      setDate("");
      setTime("");
      setDuration("60");
      if (!defaultTutorId) setTutorId("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la réservation";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !defaultTutorId ? (
        <DialogTrigger asChild>
          <Button className="gradient-primary text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            Réserver un cours
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Réserver un cours</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Matière *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sujet / Chapitre</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Intégrales, Chapitre 5..." />
          </div>

          <div className="space-y-2">
            <Label>Tuteur *</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger><SelectValue placeholder="Choisir un tuteur" /></SelectTrigger>
              <SelectContent>
                {(tutors || []).map((t: any) => (
                  <SelectItem key={t.user_id} value={t.user_id}>
                    {t.profiles?.first_name
                      ? `${t.profiles.first_name} ${t.profiles.last_name || ""} — ${(t.subjects || []).join(", ")}`
                      : `Tuteur — ${(t.subjects || []).join(", ")}`}
                  </SelectItem>
                ))}
                {(!tutors || tutors.length === 0) && (
                  <SelectItem value="__none" disabled>Aucun tuteur disponible</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Heure *</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Durée</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 heures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={createLesson.isPending}>
            {createLesson.isPending ? "Réservation..." : "Confirmer la réservation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
