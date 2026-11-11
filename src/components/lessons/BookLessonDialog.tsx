import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCreateLesson, useTutors } from "@/hooks/useData";
import { useUserCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { SUBJECTS } from "@/lib/constants";
import {
  LESSON_DURATIONS, FREE_CANCEL_HOURS, lessonCreditCost, lessonPriceEur, friendlyError,
} from "@/lib/credits";

interface BookLessonDialogProps {
  defaultTutorId?: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

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
  const { data: credits } = useUserCredits();

  // Sync if defaultTutorId changes (e.g. different tutor clicked)
  useEffect(() => {
    if (defaultTutorId) setTutorId(defaultTutorId);
  }, [defaultTutorId]);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const bookableTutors = useMemo(
    () => (tutors || []).filter((t) => t.user_id !== user?.id),
    [tutors, user?.id],
  );
  const selectedTutor = bookableTutors.find((t) => t.user_id === tutorId);

  // Propose en priorité les matières enseignées par le prof choisi
  const subjectOptions = selectedTutor?.subjects?.length ? selectedTutor.subjects : SUBJECTS;
  useEffect(() => {
    if (subject && selectedTutor?.subjects?.length && !selectedTutor.subjects.includes(subject)) {
      setSubject("");
    }
  }, [selectedTutor, subject]);

  const durationMin = parseInt(duration, 10);
  const cost = selectedTutor ? lessonCreditCost(selectedTutor.hourly_rate, durationMin) : null;
  const price = selectedTutor ? lessonPriceEur(selectedTutor.hourly_rate, durationMin) : null;
  const balance = credits?.balance ?? 0;
  const missing = cost !== null ? Math.max(0, cost - balance) : 0;

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) onClose?.();
  };

  const resetForm = () => {
    setSubject("");
    setTopic("");
    setDate("");
    setTime("");
    setDuration("60");
    if (!defaultTutorId) setTutorId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Connectez-vous pour réserver un cours");
      return;
    }
    if (!subject || !date || !time || !tutorId) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      toast.error("La date et l'heure doivent être dans le futur");
      return;
    }
    if (missing > 0) {
      toast.error(`Il vous manque ${missing} crédit${missing > 1 ? "s" : ""} pour ce cours`);
      return;
    }
    try {
      await createLesson.mutateAsync({
        tutor_id: tutorId,
        subject,
        topic: topic.trim() || null,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: durationMin,
      });
      toast.success("Demande envoyée ! Le professeur doit maintenant la confirmer.");
      setOpen(false);
      onClose?.();
      resetForm();
    } catch (error: unknown) {
      toast.error(friendlyError(error, "Erreur lors de la réservation"));
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

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réserver un cours</DialogTitle>
          <DialogDescription>
            Les crédits sont débités à la réservation et remboursés si le professeur refuse,
            ou si vous annulez plus de {FREE_CANCEL_HOURS} h avant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="book-tutor">Professeur *</Label>
            <Select value={tutorId} onValueChange={setTutorId}>
              <SelectTrigger id="book-tutor"><SelectValue placeholder="Choisir un professeur" /></SelectTrigger>
              <SelectContent>
                {bookableTutors.map((t) => (
                  <SelectItem key={t.user_id} value={t.user_id}>
                    {t.profiles?.first_name
                      ? `${t.profiles.first_name} ${t.profiles.last_name || ""}`.trim()
                      : "Professeur"}
                    {" — "}{Number(t.hourly_rate) || 0} €/h
                  </SelectItem>
                ))}
                {bookableTutors.length === 0 && (
                  <SelectItem value="__none" disabled>Aucun professeur disponible</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-subject">Matière *</Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="book-subject"><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-topic">Sujet / Chapitre</Label>
            <Input id="book-topic" value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder="Ex : Intégrales, chapitre 5…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="book-date">Date *</Label>
              <Input id="book-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayLocal()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-time">Heure *</Label>
              <Input id="book-time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="book-duration">Durée</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="book-duration"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LESSON_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cost !== null && (
            <div className={`rounded-xl border p-3 text-sm ${missing > 0 ? "border-destructive/40 bg-destructive/5" : "border-border/50 bg-muted/30"}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium">
                  <Coins className="h-4 w-4 text-gold" />
                  Coût : {cost} crédit{cost > 1 ? "s" : ""}
                </span>
                <span className="text-muted-foreground">
                  ≈ {price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Votre solde : {balance} crédit{balance > 1 ? "s" : ""}</p>
              {missing > 0 && (
                <p className="mt-2 text-xs text-destructive">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                  Il vous manque {missing} crédit{missing > 1 ? "s" : ""}.{" "}
                  <Link to="/credits" className="font-semibold underline" onClick={() => handleOpenChange(false)}>
                    Acheter des crédits
                  </Link>
                </p>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={createLesson.isPending || missing > 0}
          >
            {createLesson.isPending ? "Réservation…" : cost !== null ? `Réserver pour ${cost} crédit${cost > 1 ? "s" : ""}` : "Confirmer la réservation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
