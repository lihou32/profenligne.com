import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


const STUDENT_FAQS = [
  { q: "Comment réserver un cours ?", a: "Va dans « Trouver un prof », ouvre la fiche d'un prof et choisis un créneau libre dans son agenda : le cours est confirmé tout de suite. Le prix est débité de ton solde à la réservation." },
  { q: "Comment avoir un prof tout de suite ?", a: "Va dans « Rejoindre un cours », choisis ta matière et la durée, puis clique sur « Rejoindre » : le premier prof libre te rejoint en visio. Si personne n'est libre, tu passes en file d'attente. Le prix n'est débité que quand un prof te rejoint." },
  { q: "Comment se passe le cours ?", a: "La salle de cours s'ouvre 15 minutes avant l'heure, depuis « Salle de cours » ou « Mes cours ». Tu y retrouves la visio, un tableau partagé (enregistré pour plus tard) et un chat avec ton prof. Autorise la caméra et le micro quand ton navigateur te le demande." },
  { q: "Comment annuler un cours ?", a: "Dans « Mes cours », ouvre le cours et clique sur « Annuler ». Jusqu'à 24 h avant (2 h avec un abonnement), le prix est remis sur ton solde. Si le prof refuse ou annule, tu es toujours remboursé." },
  { q: "Combien coûte un cours ?", a: "Le même prix chez tous les profs, selon la durée : 20 min 15 €, 30 min 25 €, 45 min 30 €, 1 h 35 €, 1 h 30 50 €, 2 h 65 €. Après 21 h, un cours en direct coûte 5 € de plus. Ton solde n'expire jamais." },
  { q: "Comment recharger mon solde ?", a: "Va dans « Mon solde », choisis une recharge (50 € → +5 € offerts, 70 € → +7,50 €, 100 € → +15 €, 150 € → +25 €) ou un montant libre, puis paie par WhatsApp, virement ou Revolut avec ta référence. Ton solde est crédité dès réception, en général sous 24 h." },
  { q: "Comment fonctionne le parrainage ?", a: "Partage ton lien de parrainage. Quand un ami s'inscrit avec ton lien et termine son premier cours, vous recevez chacun 10 € sur votre solde." },
];

const TUTOR_FAQS = [
  { q: "Comment les élèves me trouvent-ils ?", a: "Ta fiche publique (menu « Ma fiche publique ») apparaît dans la liste des profs. Ajoute une phrase d'accroche, tes matières et tes niveaux dans ton profil, et ouvre des créneaux dans « Mes disponibilités » : les élèves réservent directement, le cours est confirmé tout de suite." },
  { q: "Comment recevoir des élèves en direct ?", a: "Sur ton accueil, active « En ligne » et garde la page ouverte : le prochain élève de ta matière t'est envoyé automatiquement et vous entrez en salle tous les deux." },
  { q: "Comment se passe le cours ?", a: "La salle de cours s'ouvre 15 minutes avant l'heure, depuis « Salle de cours » ou « Mes cours ». Tu y as la visio, un tableau partagé (enregistré pour plus tard), le partage d'écran et un chat. À la fin, clique sur « Terminer le cours » pour être payé." },
  { q: "Et si un élève demande un horaire hors de mon agenda ?", a: "Tu reçois une demande dans « Mes cours » : accepte-la ou refuse-la. Si tu refuses, l'élève est remboursé automatiquement." },
  { q: "Combien je gagne et quand je suis payé ?", a: "Tu touches 80 % du prix de chaque cours terminé. Tes gains s'affichent dans « Mes revenus » ; tu peux demander un retrait dès 20 € (2 % de frais de retrait)." },
  { q: "Et si je dois annuler ?", a: "Préviens le plus tôt possible : annule depuis « Mes cours ». L'élève est toujours remboursé intégralement." },
];

export default function Help() {
  useDocumentTitle("Centre d'aide");
  const { user, mode } = useAuth();
  const faqs = user && mode === "tutor" ? TUTOR_FAQS : STUDENT_FAQS;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Aide" title="Comment on peut t'aider ?" subtitle="Les réponses aux questions les plus fréquentes." />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-primary" />
            Questions fréquentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <h3 className="">Besoin d'aide supplémentaire ?</h3>
          <p className="text-sm text-muted-foreground">Notre équipe est disponible pour vous aider</p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href="mailto:support@tonprofenligne.com">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
            <Button asChild>
              <a href="mailto:support@tonprofenligne.com?subject=Aide - Ton Prof en Ligne">
                <MessageCircle className="mr-2 h-4 w-4" />
                Nous contacter
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
