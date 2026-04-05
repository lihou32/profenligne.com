import { useMemo } from "react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Award, BookOpen, Download, Star, Calendar, User } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import jsPDF from "jspdf"

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertificateCard({ cert }: { cert: any }) {
  const completedDate = cert.completed_at
    ? format(new Date(cert.completed_at), "d MMMM yyyy", { locale: fr })
    : "Date inconnue"

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const w = doc.internal.pageSize.getWidth()
    const h = doc.internal.pageSize.getHeight()

    // Background
    doc.setFillColor(250, 250, 255)
    doc.rect(0, 0, w, h, "F")

    // Double border
    doc.setDrawColor(99, 102, 241)
    doc.setLineWidth(1.5)
    doc.rect(12, 12, w - 24, h - 24)
    doc.setLineWidth(0.5)
    doc.rect(16, 16, w - 32, h - 32)

    // Decorative line
    doc.setDrawColor(167, 139, 250)
    doc.setLineWidth(0.3)
    doc.line(50, 48, w - 50, 48)

    // Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(32)
    doc.setTextColor(99, 102, 241)
    doc.text("CERTIFICAT DE REUSSITE", w / 2, 40, { align: "center" })

    // "Décerné à"
    doc.setFont("helvetica", "normal")
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text("Ce certificat est d\u00e9cern\u00e9 \u00e0", w / 2, 62, { align: "center" })

    // Student name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(26)
    doc.setTextColor(30, 30, 50)
    doc.text(cert.student_name ?? "Etudiant", w / 2, 78, { align: "center" })

    // "pour avoir complété"
    doc.setFont("helvetica", "normal")
    doc.setFontSize(13)
    doc.setTextColor(100, 100, 100)
    doc.text("pour avoir compl\u00e9t\u00e9 avec succ\u00e8s un cours de", w / 2, 92, { align: "center" })

    // Subject
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.setTextColor(99, 102, 241)
    doc.text(cert.subject, w / 2, 106, { align: "center" })

    // Topic
    let yPos = 114
    if (cert.topic) {
      doc.setFont("helvetica", "italic")
      doc.setFontSize(12)
      doc.setTextColor(120, 120, 120)
      doc.text(cert.topic, w / 2, yPos, { align: "center" })
      yPos += 10
    }

    // Separator
    doc.setDrawColor(167, 139, 250)
    doc.setLineWidth(0.3)
    doc.line(80, yPos + 2, w - 80, yPos + 2)
    yPos += 14

    // Details
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text(`Professeur : ${cert.tutor_name}`, w / 2, yPos, { align: "center" })
    yPos += 8
    doc.text(`Date : ${completedDate}`, w / 2, yPos, { align: "center" })
    yPos += 8
    if (cert.duration_minutes) {
      doc.text(`Dur\u00e9e : ${cert.duration_minutes} minutes`, w / 2, yPos, { align: "center" })
    }

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(160, 160, 160)
    doc.text("Prof en Ligne \u2014 plateforme de cours particuliers", w / 2, h - 22, { align: "center" })

    // Download
    const fileName = `certificat_${cert.subject.replace(/\s+/g, "_")}_${completedDate.replace(/\s+/g, "_")}.pdf`
    doc.save(fileName)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-lg hover:shadow-primary/20 hover:border-primary/60 transition-all duration-300 group">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-primary/5 rounded-tr-full" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Certificat de réussite</p>
            <h3 className="font-bold text-lg leading-tight">{cert.subject}</h3>
          </div>
        </div>
        {cert.rating && (
          <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 rounded-full px-2 py-1 text-xs font-semibold">
            <Star className="h-3 w-3 fill-current" />
            {Number(cert.rating).toFixed(1)}
          </div>
        )}
      </div>

      {/* Topic */}
      {cert.topic && (
        <p className="text-sm text-muted-foreground mb-3 italic">"{cert.topic}"</p>
      )}

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>Professeur : <span className="text-foreground font-medium">{cert.tutor_name}</span></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Complété le <span className="text-foreground font-medium">{completedDate}</span></span>
        </div>
        {cert.duration_minutes && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Durée : <span className="text-foreground font-medium">{cert.duration_minutes} min</span></span>
          </div>
        )}
      </div>

      {/* Badge */}
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
          ✓ Cours complété
        </Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadPDF}
          className="h-7 text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Download className="h-3 w-3" />
          Télécharger
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Certificates() {
  useDocumentTitle("Mes Certificats")
  const { user } = useAuth()

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch completed lessons for this student
      const { data: ls, error } = await supabase
        .from("lessons")
        .select("id, subject, topic, scheduled_at, duration_minutes, status, tutor_id, student_id")
        .eq("student_id", user!.id)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
      if (error) throw error
      if (!ls || ls.length === 0) return []

      // Fetch tutor profiles
      const tutorIds = [...new Set((ls ?? []).map((l) => l.tutor_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("user_id", tutorIds)
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]))

      return (ls ?? []).map((l) => {
        const p = profileMap.get(l.tutor_id)
        const tutorName = p
          ? `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Professeur"
          : "Professeur"
        return {
          ...l,
          tutor_name: tutorName,
          completed_at: l.scheduled_at,
          // lessons.rating is 0-20, convert to 0-5 for display
          rating: l.rating != null ? (l.rating / 4).toFixed(1) : null,
        }
      })
    },
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-primary/10 p-4">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Mes Certificats</h1>
          <p className="text-muted-foreground mt-0.5">
            {lessons.length} certificat{lessons.length !== 1 ? "s" : ""} obtenu{lessons.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      {lessons.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <Award className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{lessons.length}</p>
                <p className="text-xs text-muted-foreground">Cours complétés</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {[...new Set(lessons.map((l) => l.subject))].length}
                </p>
                <p className="text-xs text-muted-foreground">Matières</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card sm:block hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {lessons.filter((l: any) => l.rating).length > 0
                    ? (lessons.filter((l: any) => l.rating)
                        .reduce((acc: number, l: any) => acc + Number(l.rating), 0) /
                        lessons.filter((l: any) => l.rating).length
                      ).toFixed(1)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Note moyenne</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : lessons.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-20 text-center">
            <Award className="mx-auto h-16 w-16 mb-4 text-muted-foreground/20" />
            <h2 className="text-xl font-semibold mb-2">Aucun certificat pour l'instant</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Terminez votre premier cours pour obtenir votre certificat de réussite !
            </p>
            <Button className="mt-6" onClick={() => window.location.href = "/tutors"}>
              Trouver un professeur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(lessons ?? []).map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))}
        </div>
      )}
    </div>
  )
}
