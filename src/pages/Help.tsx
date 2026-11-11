import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


const faqs = [
  { q: "Comment réserver un cours ?", a: "Rendez-vous dans la section 'Mes Cours' et cliquez sur 'Réserver un cours'. Sélectionnez le tuteur, la matière et le créneau qui vous convient." },
  { q: "Comment fonctionne le LiveConnect ?", a: "LiveConnect vous permet de rejoindre des cours en visioconférence. Vous pouvez voir les sessions en cours ou en démarrer une nouvelle." },
  { q: "Comment annuler un cours ?", a: "Allez dans 'Mes Cours', sélectionnez le cours à annuler et cliquez sur 'Annuler'. Tant que le professeur n'a pas confirmé, ou jusqu'à 24 h avant le cours, vos crédits sont intégralement remboursés. Si le professeur refuse ou annule, vous êtes toujours remboursé." },
  { q: "Comment fonctionne le système de crédits ?", a: "Les crédits permettent de réserver des cours. 1 crédit vaut 5 € de cours : un cours d'1 h avec un professeur à 35 €/h coûte donc 7 crédits. Les crédits sont débités à la réservation, remboursés si le professeur refuse ou si vous annulez plus de 24 h avant, et n'expirent jamais." },
  { q: "Comment gagner des points XP ?", a: "Chaque cours terminé rapporte 100 XP aux élèves et 50 XP aux professeurs. Plus vous accumulez d'XP, plus vous montez de niveau et débloquez des badges." },
  { q: "Comment fonctionne le parrainage ?", a: "Partagez votre lien de parrainage unique avec vos amis. Quand ils s'inscrivent avec votre lien et terminent leur premier cours, vous recevez chacun 2 crédits offerts." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Vous pouvez payer par WhatsApp, par virement bancaire ou par Revolut. Choisissez un pack, suivez les instructions avec votre référence : les crédits sont ajoutés dès réception du paiement, en général sous 24 h." },
];

export default function Help() {
  useDocumentTitle("Centre d'aide");
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
          <h3 className="font-semibold">Besoin d'aide supplémentaire ?</h3>
          <p className="text-sm text-muted-foreground">Notre équipe est disponible pour vous aider</p>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <a href="mailto:support@profenligne.fr">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
            <Button asChild>
              <a href="mailto:support@profenligne.fr?subject=Aide - Prof en Ligne">
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
