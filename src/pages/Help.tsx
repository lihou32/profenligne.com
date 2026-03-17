import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const faqs = [
  { q: "Comment réserver un cours ?", a: "Rendez-vous dans la section 'Mes Cours' et cliquez sur 'Réserver un cours'. Sélectionnez le tuteur, la matière et le créneau qui vous convient." },
  { q: "Comment fonctionne le LiveConnect ?", a: "LiveConnect vous permet de rejoindre des cours en visioconférence. Vous pouvez voir les sessions en cours ou en démarrer une nouvelle." },
  { q: "Comment utiliser l'AI Tutor ?", a: "L'AI Tutor est un assistant intelligent qui peut vous aider avec vos devoirs. Posez-lui vos questions ou envoyez une photo de votre exercice." },
  { q: "Comment annuler un cours ?", a: "Allez dans 'Mes Cours', sélectionnez le cours à annuler et cliquez sur 'Annuler'. Les annulations sont gratuites jusqu'à 24h avant le cours." },
  { q: "Quels sont les moyens de paiement acceptés ?", a: "Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal et les virements bancaires." },
];

export default function Help() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Centre d'aide</h1>
        <p className="text-muted-foreground">Trouvez des réponses à vos questions</p>
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
            <Button className="gradient-primary text-primary-foreground" onClick={() => toast.info("Le chat en direct sera bientôt disponible !")}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat en direct
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
