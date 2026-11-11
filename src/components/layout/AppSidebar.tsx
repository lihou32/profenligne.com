import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, BookOpen, Video, HelpCircle, LogOut, Shield, Star,
  Wallet, Coins, Settings, Search, Award, Gift, UserRound,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/useAuth"
import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

type Item = { title: string; icon: React.ComponentType<{ className?: string }>; path: string }

const STUDENT: { label: string; items: Item[] }[] = [
  { label: "Apprendre", items: [
    { title: "Accueil", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Trouver un prof", icon: Search, path: "/tutors" },
    { title: "Mes cours", icon: BookOpen, path: "/lessons" },
    { title: "Salle de cours", icon: Video, path: "/live" },
  ] },
  { label: "Mon compte", items: [
    { title: "Crédits", icon: Coins, path: "/credits" },
    { title: "Certificats", icon: Award, path: "/certificates" },
    { title: "Avis", icon: Star, path: "/reviews" },
    { title: "Parrainage", icon: Gift, path: "/referral" },
  ] },
]

const TUTOR: { label: string; items: Item[] }[] = [
  { label: "Enseigner", items: [
    { title: "Accueil", icon: LayoutDashboard, path: "/dashboard" },
    { title: "Mes cours", icon: BookOpen, path: "/lessons" },
    { title: "Salle de cours", icon: Video, path: "/live" },
    { title: "Mes revenus", icon: Wallet, path: "/earnings" },
  ] },
  { label: "Ma vitrine", items: [
    { title: "Mes avis", icon: Star, path: "/reviews" },
    { title: "Les profs", icon: Search, path: "/tutors" },
    { title: "Parrainage", icon: Gift, path: "/referral" },
  ] },
]

const GENERAL: Item[] = [
  { title: "Profil", icon: UserRound, path: "/profile" },
  { title: "Réglages", icon: Settings, path: "/settings" },
  { title: "Aide", icon: HelpCircle, path: "/help" },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, profile, hasRole, user } = useAuth()
  const isTutor = hasRole("tutor")
  const queryClient = useQueryClient()
  const { isMobile, setOpenMobile } = useSidebar()
  const close = () => { if (isMobile) setOpenMobile(false) }

  const { data: xp } = useQuery({
    queryKey: ["my-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_xp").select("total_xp").eq("user_id", user!.id).maybeSingle()
      return data?.total_xp ?? 0
    },
  })

  // Pastille de notifications en temps réel (badge dans la barre du haut)
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel("sidebar-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["unread-notifications", user.id] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, queryClient])

  const handleSignOut = async () => {
    try { await signOut(); toast.success("À bientôt !"); navigate("/login") }
    catch { toast.error("Déconnexion impossible") }
  }

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Mon compte"
  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?"
  const groups = isTutor ? TUTOR : STUDENT

  const NavItem = ({ item }: { item: Item }) => {
    const active = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"))
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title}
          className={cn(
            "h-11 rounded-xl px-3.5 font-semibold transition-all",
            active ? "!bg-white !text-ink-2 font-semibold ring-1 ring-border" : "text-ink-2/70 hover:!bg-secondary hover:!text-ink-2",
          )}>
          <Link to={item.path} onClick={close} aria-current={active ? "page" : undefined}>
            <item.icon className="h-[18px] w-[18px]" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className="border-r-0" aria-label="Navigation principale">
      <SidebarHeader className="px-5 pb-4 pt-6">
        <Logo to="/dashboard" />
      </SidebarHeader>

      <SidebarContent className="px-1">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{g.label}</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu className="gap-0.5">{g.items.map((i) => <NavItem key={i.path} item={i} />)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Général</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {GENERAL.map((i) => <NavItem key={i.path} item={i} />)}
              {hasRole("admin") && <NavItem item={{ title: "Administration", icon: Shield, path: "/admin" }} />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-3 rounded-2xl bg-background p-2.5">
          <Link to="/profile" onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-peri-soft text-sm font-bold text-ink">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-ink-2">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {isTutor ? "Professeur" : "Élève"}{xp ? ` · ${xp.toLocaleString("fr-FR")} XP` : ""}
              </span>
            </span>
          </Link>
          <button onClick={handleSignOut} aria-label="Se déconnecter"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-rose-soft hover:text-rose">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
