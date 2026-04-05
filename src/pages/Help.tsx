import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


const faqs = [
  { q: "Comment réserver un cours ?", a: "Rendez-vous dans la section 'Mes Cours' et cliquez sur 'Réserver un cours'. Sélectionnez le tuteur, la matière et le créneau qui vous convient." },
  { q: "Comment fonctionne le LiveConnect ?", a: "LiveConnect vous permet de rejoindre des cours en visioconférence. Vous pouvez voir les sessions en cours ou en démarrer une nouvelle." },
  { q: "Comment annuler un cours ?", a: "Allez dans 'Mes Cours', sélectionnez le cours à annuler et cliquez sur 'Annuler'. Les annulations sont gratuites jusqu'à 24h avant le cours." },
  { q: "Comment fonctionne le système de crédits ?", a: "Les crédits permettent de réserver des cours. Vous pouvez en acheter via la section 'Acheter des crédits'. Chaque cours coûte un certain nombre de crédits selon la durée et le tuteur." },
  { q: "Comment gagner des points XP ?", a: "Vous gagnez de l'XP en complétant des cours et en laissant des avis. Plus vous accumulez d'XP, plus vous montez de niveau et débloquez des badges." },
  { q: "Comment fonctionne le parrainage ?", a: "Partagez votre lien de parrainage unique avec vos amis. Quand ils s'inscrivent et complètent leur premier cours, vous recevez tous les deux des crédits bonus." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Nous acceptons les cartes bancaires (Visa, Mastercard) via notre partenaire de paiement sécurisé Stripe." },
];

export default function Help() {
  useDocumentTitle("Centre d'aide");
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight font-display gradient-text">Centre d'aide</h1>
        <p className="mt-2 text-muted-foreground">Trouvez des réponses à vos questions</p>
      </div>

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
            <Button className="gradient-primary text-primary-foreground" asChild>
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
