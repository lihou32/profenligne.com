import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Outlet, Navigate, useLocation, Link } from "react-router-dom"
import { Bell, ChevronDown, Coins, LogOut, Search, Settings, UserRound } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useReveal } from "@/hooks/useReveal"
import { supabase } from "@/integrations/supabase/client"
import { LogoMark } from "@/components/brand/Logo"
import { formatEur } from "@/lib/credits"
import { useTutorProfile } from "@/hooks/useTutors"
import { useTutorHeartbeat } from "@/hooks/useAgenda"
import { LegalLinks } from "@/components/layout/PublicLayout"

/** Tant que l'appli d'un prof en ligne est ouverte, la base sait qu'il est là. */
function TutorPresence() {
  const { data: tutor } = useTutorProfile()
  useTutorHeartbeat(tutor?.status === "online" || tutor?.status === "busy")
  return null
}

/**
 * Espace connecté : barre latérale crème, contenu aéré sur fond crème.
 */
export function AppLayout() {
  const { user, loading, mode, profile } = useAuth()
  const location = useLocation()
  useReveal()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LogoMark className="h-12 w-12 animate-pulse" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />

  const initials = `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() || "?"

  return (
    <SidebarProvider>
      <AppSidebar />
      {mode === "tutor" && <TutorPresence />}
      <SidebarInset className="relative min-w-0 bg-background">
        <TopBar isTutor={mode === "tutor"} userId={user.id} initials={initials} avatar={profile?.avatar_url ?? null} name={profile?.first_name ?? ""} />
        <main className="relative flex-1 px-4 pb-20 pt-2 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
        <footer className="px-4 pb-6 md:px-10">
          <LegalLinks className="mx-auto w-full max-w-6xl" />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}

function TopBar({ isTutor, userId, initials, avatar, name }: { isTutor: boolean; userId: string; initials: string; avatar: string | null; name: string }) {
  const { data: credits } = useUserCredits()
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", userId],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false)
      return count ?? 0
    },
  })

  return (
    <header className="sticky top-0 z-20 border-b-2 border-ink-2 bg-background px-4 md:px-10">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3">
        <SidebarTrigger className="h-10 w-10 rounded-xl border-2 border-ink-2 bg-white text-ink-2 md:hidden" />
        {!isTutor && (
          <Link to="/tutors" className="hidden h-11 w-full max-w-sm items-center gap-2 rounded-xl border-2 border-ink-2 bg-white px-4 text-sm text-muted-foreground transition hover:border-ink-2/25 hover:text-ink-2 sm:flex">
            <Search className="h-4 w-4" /> Rechercher un prof, une matière…
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isTutor && (
            <Link to="/credits" aria-label={`Solde : ${formatEur(credits?.balanceEur ?? 0)} — recharger`}
              className="flex h-10 items-center gap-2 rounded-xl border-2 border-ink-2 bg-sun px-3.5 text-sm font-bold text-ink-2 shadow-[2px_2px_0_0_hsl(var(--ink-2))] transition hover:-translate-y-px">
              <Coins className="h-4 w-4" /><span className="tabular">{formatEur(credits?.balanceEur ?? 0)}</span>
            </Link>
          )}
          <Link to="/notifications" aria-label={unread ? `${unread} notifications non lues` : "Notifications"}
            className="relative grid h-10 w-10 place-items-center rounded-xl border-2 border-ink-2 bg-white text-ink-2 transition hover:border-ink-2/25">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-hl px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <AccountMenu initials={initials} avatar={avatar} name={name} />
        </div>
      </div>
    </header>
  )
}

/** Menu du compte (en haut à droite) : profil, réglages, déconnexion. */
function AccountMenu({ initials, avatar, name }: { initials: string; avatar: string | null; name: string }) {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const logout = async () => {
    await signOut().catch(() => undefined)
    queryClient.clear()
    window.location.assign("/login")
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-ink-2 transition hover:bg-secondary" aria-label="Mon compte">
        {avatar ? <img src={avatar} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-ink-2 bg-peri-soft text-xs font-bold text-ink-2">{initials}</span>}
        <span className="hidden text-sm font-semibold lg:inline">{name}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl border-2 border-ink-2">
        <DropdownMenuItem asChild><Link to="/profile"><UserRound className="mr-2 h-4 w-4" />Mon profil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Réglages</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
