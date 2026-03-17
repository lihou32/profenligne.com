import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BookOpen, Video, Bot, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, useMarkNotificationsRead } from "@/hooks/useData";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const iconMap: Record<string, any> = {
  lesson: BookOpen,
  live: Video,
  ai: Bot,
  system: CheckCircle,
  info: Bell,
};

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Aucune nouvelle notification"}
          </p>
        </div>
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
                className={`flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 ${!notif.read ? "bg-primary/5" : ""}`}
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
