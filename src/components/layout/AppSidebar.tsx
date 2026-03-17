import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Video, Bell, HelpCircle,
  LogOut, GraduationCap, Shield, Zap, Star, Crown,
  DollarSign, CreditCard, Settings, Bot, Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { XPBadge } from "@/components/gamification/XPBadge";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const studentPrincipalNav = [
  { title: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Mes Leçons", icon: BookOpen, path: "/lessons" },
  { title: "Messages", icon: Bell, path: "/notifications" },
];

const studentApprentissageNav = [
  { title: "Cours en direct", icon: Video, path: "/live" },
  { title: "AI Tutor", icon: Bot, path: "/ai-tutor" },
  { title: "Trouver un prof", icon: Users, path: "/tutors" },
  { title: "Avis Profs", icon: Star, path: "/reviews" },
  { title: "Acheter des crédits", icon: CreditCard, path: "/credits" },
  { title: "Club Prestige", icon: Crown, path: "/pricing" },
];

const tutorPrincipalNav = [
  { title: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
  { title: "Mes Cours", icon: BookOpen, path: "/lessons" },
  { title: "Messages", icon: Bell, path: "/notifications" },
];

const tutorActiviteNav = [
  { title: "Mes Revenus", icon: DollarSign, path: "/earnings" },
  { title: "Mes Avis", icon: Star, path: "/reviews" },
  { title: "Cours en direct", icon: Video, path: "/live" },
  { title: "Classement profs", icon: Users, path: "/tutors" },
];

const generalNav = [
  { title: "Paramètres", icon: Settings, path: "/settings" },
  { title: "Aide", icon: HelpCircle, path: "/help" },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, hasRole, user } = useAuth();
  const isTutor = hasRole("tutor");

  // Fetch current user's XP
  const { data: xpData } = useQuery({
    queryKey: ["my-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_xp")
        .select("total_xp")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.total_xp ?? 0;
    },
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      navigate("/login");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Utilisateur"
    : "Utilisateur";

  const initials = profile
    ? `${(profile.first_name?.[0] || "").toUpperCase()}${(profile.last_name?.[0] || "").toUpperCase()}`
    : "U";

  const roleLabel = isTutor ? "Professeur" : "Étudiant";

  const renderNavItems = (items: { title: string; icon: any; path: string }[]) =>
    items.map((item) => {
      const isActive = location.pathname === item.path;
      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            className={`rounded-xl mx-1 my-0.5 h-10 transition-all duration-200 ${
              isActive
                ? "gradient-primary text-primary-foreground shadow-lg"
                : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            }`}
          >
            <Link to={item.path}>
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  const principalNav = isTutor ? tutorPrincipalNav : studentPrincipalNav;
  const secondaryNav = isTutor ? tutorActiviteNav : studentApprentissageNav;
  const secondaryLabel = isTutor ? "Activité" : "Apprentissage";

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="gradient-primary flex h-11 w-11 items-center justify-center rounded-xl glow transition-transform group-hover:scale-105 group-hover:rotate-3">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground font-display">
              PROF EN LIGNE
            </span>
            <span className="text-[10px] font-medium text-sidebar-foreground/35 flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 text-gold" />
              Tutorat Interactif
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="opacity-30" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25 px-3">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(principalNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="opacity-30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25 px-3">
            {secondaryLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(secondaryNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="opacity-30" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25 px-3">
            Général
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderNavItems(generalNav)}
              {hasRole("admin") && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === "/admin"}
                    tooltip="Admin"
                    className={`rounded-xl mx-1 my-0.5 h-10 transition-all duration-200 ${
                      location.pathname === "/admin"
                        ? "gradient-primary text-primary-foreground shadow-lg"
                        : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Link to="/admin">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Administration</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="opacity-30" />
        <Link to="/profile" className="flex items-center gap-3 rounded-xl p-3 mt-2 bg-sidebar-accent/40 border border-sidebar-border/50 hover:bg-sidebar-accent/60 transition-colors cursor-pointer">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
            {xpData !== undefined && xpData > 0 ? (
              <XPBadge xp={xpData} size="sm" showLabel className="mt-0.5" />
            ) : (
              <p className="truncate text-[10px] text-sidebar-foreground/35 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
                {roleLabel}
              </p>
            )}
          </div>
        </Link>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Déconnexion"
              className="rounded-xl mx-1 hover:bg-destructive/15 hover:text-destructive text-sidebar-foreground/50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium">Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
