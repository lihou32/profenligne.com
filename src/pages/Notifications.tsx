import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/brand/PageHeader";
import { Badge } from "@/components/ui/badge";
import type { ComponentType } from "react";
import { Bell, BookOpen, Video, Bot, CheckCircle, CreditCard, Star, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  lesson: BookOpen,
  live: Video,
  ai: Bot,
  system: CheckCircle,
  info: Bell,
  payment: CreditCard,
  review: Star,
  referral: Gift,
};

export default function Notifications() {
  useDocumentTitle("Notifications");
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const navigate = useNavigate();

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Notifications" title="Quoi de neuf ?" subtitle={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tu es à jour."} />
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markRead.mutate()} disabled={markRead.isPending}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card className="glass-card">
        <CardContent className="divide-y p-0">
          {isLoading && <p className="p-6 text-center text-muted-foreground">Chargement...</p>}
          {!isLoading && (!notifications || notifications.length === 0) && (
            <p className="p-6 text-center text-muted-foreground">Aucune notification</p>
          )}
          {(notifications || []).map((notif) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <div
                key={notif.id}
                role={notif.link ? "button" : undefined}
                tabIndex={notif.link ? 0 : undefined}
                onClick={() => notif.link && navigate(notif.link)}
                onKeyDown={(e) => e.key === "Enter" && notif.link && navigate(notif.link)}
                className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!notif.read ? "bg-primary/5" : ""} ${notif.link ? "cursor-pointer" : ""}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${!notif.read ? "gradient-primary" : "bg-muted"}`}>
                  <Icon className={`h-5 w-5 ${!notif.read ? "text-primary-foreground" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{notif.title}</h3>
                    {!notif.read && <Badge variant="secondary" className="text-[10px]">Nouveau</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{notif.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(notif.created_at), "dd MMM à HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
