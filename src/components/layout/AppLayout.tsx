import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Outlet, Navigate, useLocation, Link } from "react-router-dom"
import { Bell, Coins, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useReveal } from "@/hooks/useReveal"
import { supabase } from "@/integrations/supabase/client"
import { LogoMark } from "@/components/brand/Logo"

/**
 * Espace connecté, d'après les maquettes : barre latérale blanche, et à droite
 * un panneau aux coins arrondis dont le haut porte le dégradé signature.
 */
export function AppLayout() {
  const { user, loading, hasRole, profile } = useAuth()
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
      <SidebarInset className="relative min-w-0 overflow-hidden bg-background md:my-2 md:mr-2 md:rounded-[2.25rem]">
        <div aria-hidden className="brand-gradient pointer-events-none absolute inset-x-0 top-0 h-[300px]" />
        <TopBar isTutor={hasRole("tutor")} userId={user.id} initials={initials} avatar={profile?.avatar_url ?? null} name={profile?.first_name ?? ""} />
        <main className="relative flex-1 px-4 pb-16 pt-2 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
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
    <header className="relative z-20 px-4 pt-4 md:px-8">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3">
        <SidebarTrigger className="h-10 w-10 rounded-xl bg-white/15 text-white hover:bg-white/25 hover:text-white md:hidden" />
        <Link to="/tutors" className="hidden h-11 w-full max-w-sm items-center gap-2 rounded-xl bg-white px-4 text-sm text-muted-foreground shadow-card transition hover:text-ink-2 sm:flex">
          <Search className="h-4 w-4" /> Rechercher un prof, une matière…
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {!isTutor && (
            <Link to="/credits" aria-label={`${credits?.balance ?? 0} crédits — acheter des crédits`}
              className="flex h-10 items-center gap-2 rounded-xl bg-white/15 px-3.5 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/25">
              <Coins className="h-4 w-4" /><span className="tabular">{credits?.balance ?? 0}</span><span className="hidden sm:inline">crédits</span>
            </Link>
          )}
          <Link to="/notifications" aria-label={unread ? `${unread} notifications non lues` : "Notifications"}
            className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-hl">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <Link to="/profile" className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 text-white transition hover:bg-white/10" aria-label="Mon profil">
            {avatar ? <img src={avatar} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-xs font-bold text-ink">{initials}</span>}
            <span className="hidden text-sm font-semibold lg:inline">{name}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
