import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


const faqs = [
  { q: "Comment réserver un cours ?", a: "Rendez-vous dans la section 'Mes Cours' et cliquez sur 'Réserver un cours'. Sélectionnez le tuteur, la matière et le créneau qui vous convient." },
  { q: "Comment fonctionne le LiveConnect ?", a: "LiveConnect vous permet de rejoindre des cours en visioconférence. Vous pouvez voir les sessions en cours ou en démarrer une nouvelle." },
  { q: "Comment annuler un cours ?", a: "Allez dans 'Mes Cours', sélectionnez le cours à annuler et cliquez sur 'Annuler'. Tant que le professeur n'a pas confirmé, ou jusqu'à 24 h avant le cours, le prix du cours est intégralement remis sur votre solde. Si le professeur refuse ou annule, vous êtes toujours remboursé." },
  { q: "Combien coûte un cours ?", a: "Le prix est le même chez tous les professeurs et dépend seulement de la durée : 20 min 15 €, 30 min 25 €, 45 min 30 €, 1 h 35 €, 1 h 30 50 €, 2 h 65 €. Il est débité de votre solde à la réservation, remboursé si le professeur refuse ou si vous annulez plus de 24 h avant. Votre solde n'expire jamais." },
  { q: "Comment gagner des points XP ?", a: "Chaque cours terminé rapporte 100 XP aux élèves et 50 XP aux professeurs. Plus vous accumulez d'XP, plus vous montez de niveau et débloquez des badges." },
  { q: "Comment fonctionne le parrainage ?", a: "Partagez votre lien de parrainage unique avec vos amis. Quand ils s'inscrivent avec votre lien et terminent leur premier cours, vous recevez chacun 10 € sur votre solde." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Vous pouvez payer par WhatsApp, par virement bancaire ou par Revolut. Choisissez une recharge (50 € → +5 € offerts, 70 € → +7,50 €, 100 € → +15 €, 150 € → +25 €) ou un montant libre, puis suivez les instructions avec votre référence : votre solde est crédité dès réception du paiement, en général sous 24 h." },
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
