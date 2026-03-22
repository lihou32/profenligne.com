import { useState } from "react"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  Gift, Users, Copy, Check, Share2, Star,
  ArrowRight, Trophy, Zap,
} from "lucide-react"

// ─── How it works steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    icon: Share2,
    title: "Partagez votre lien",
    desc: "Envoyez votre lien unique à vos amis, famille ou sur les réseaux sociaux.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Users,
    title: "Votre ami s'inscrit",
    desc: "Votre filleul crée son compte sur Prof en Ligne grâce à votre lien.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Gift,
    title: "Vous gagnez des crédits",
    desc: "Dès que votre filleul réserve son premier cours, vous recevez 2 crédits offerts !",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
]

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Referral() {
  useDocumentTitle("Parrainage")
  const { user } = useAuth()
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  // Build referral link from user id
  const referralCode = user?.id?.slice(0, 8).toUpperCase() ?? "XXXXXXXX"
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast({ title: "Lien copié !", description: "Partagez-le avec vos amis." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de copier." })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Prof en Ligne — Rejoins-moi !",
        text: "Rejoins Prof en Ligne pour apprendre avec des professeurs particuliers. Utilise mon lien pour t'inscrire !",
        url: referralLink,
      })
    } else {
      handleCopy()
    }
  }

  // Fetch referral stats
  const { data: stats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("referrals")
        .select("id, referred_user_id, status, credits_awarded, created_at")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false })
      if (error) {
        // Table may not exist yet — return empty
        return { referrals: [], total: 0, creditsEarned: 0 }
      }
      const referrals = data ?? []
      const creditsEarned = referrals
        .filter((r: any) => r.status === "completed")
        .reduce((acc: number, r: any) => acc + (r.credits_awarded ?? 2), 0)
      return { referrals, total: referrals.length, creditsEarned }
    },
  })

  const totalReferrals = stats?.total ?? 0
  const creditsEarned = stats?.creditsEarned ?? 0
  const referrals = stats?.referrals ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="rounded-2xl bg-primary/10 p-5">
            <Gift className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-display">Parrainez vos amis</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Invitez vos amis sur Prof en Ligne et gagnez <strong className="text-foreground">2 crédits</strong> à chaque fois qu'ils réservent leur premier cours !
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card text-center">
          <CardContent className="pt-5 pb-4">
            <Users className="mx-auto h-6 w-6 text-primary mb-2" />
            <p className="text-3xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Filleuls invités</p>
          </CardContent>
        </Card>
        <Card className="glass-card text-center">
          <CardContent className="pt-5 pb-4">
            <Trophy className="mx-auto h-6 w-6 text-yellow-500 mb-2" />
            <p className="text-3xl font-bold">
              {referrals.filter((r: any) => r.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Cours réservés</p>
          </CardContent>
        </Card>
        <Card className="glass-card text-center">
          <CardContent className="pt-5 pb-4">
            <Zap className="mx-auto h-6 w-6 text-green-500 mb-2" />
            <p className="text-3xl font-bold">{creditsEarned}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Crédits gagnés</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral link */}
      <Card className="glass-card border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Votre lien de parrainage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralLink}
              className="font-mono text-sm bg-muted/50"
            />
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-shrink-0 gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier"}
            </Button>
          </div>
          <Button onClick={handleShare} className="w-full gap-2">
            <Share2 className="h-4 w-4" />
            Partager maintenant
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Code de parrainage : <span className="font-mono font-bold text-foreground">{referralCode}</span>
          </p>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className={`rounded-xl ${step.bg} p-3 flex-shrink-0`}>
                <step.icon className={`h-5 w-5 ${step.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              {i < HOW_IT_WORKS.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-3 hidden sm:block" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Referral history */}
      {referrals.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Historique des parrainages
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.slice(0, 10).map((r: any, i: number) => (
              <div key={r.id ?? i} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Filleul #{i + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString("fr-FR")
                        : ""}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={r.status === "completed" ? "default" : "secondary"}
                  className={r.status === "completed"
                    ? "bg-green-500/20 text-green-500 border-green-500/30"
                    : ""}
                >
                  {r.status === "completed"
                    ? `+${r.credits_awarded ?? 2} crédits`
                    : "En attente"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground">
        Les crédits de parrainage sont crédités automatiquement après le premier cours de votre filleul.
        Offre valable pour les nouveaux inscrits uniquement. Pas de limite de parrainages.
      </p>
    </div>
  )
}
