import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Outlet, Navigate, useLocation, Link } from "react-router-dom"
import { Bell, Coins } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useUserCredits } from "@/hooks/useCredits"
import { useReveal } from "@/hooks/useReveal"
import { supabase } from "@/integrations/supabase/client"
import { Backdrop } from "@/components/brand/Backdrop"
import { LogoMark } from "@/components/brand/Logo"

export function AppLayout() {
  const { user, loading, hasRole } = useAuth()
  const location = useLocation()
  useReveal()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Backdrop />
        <div className="flex flex-col items-center gap-4">
          <LogoMark className="h-12 w-12 animate-pulse" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return (
    <SidebarProvider>
      <Backdrop />
      <AppSidebar />
      <SidebarInset>
        <TopBar isTutor={hasRole("tutor")} userId={user.id} />
        <main className="flex-1 px-4 pb-16 pt-2 md:px-8 md:pt-4">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function TopBar({ isTutor, userId }: { isTutor: boolean; userId: string }) {
  const { data: credits } = useUserCredits()
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", userId],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("read", false)
      return count ?? 0
    },
  })

  return (
    <header className="sticky top-0 z-30 px-4 pt-3 md:px-8">
      <div className="glass-strong mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full pl-2 pr-2">
        <SidebarTrigger className="h-10 w-10 rounded-full text-ink hover:bg-ink/[0.06]" />
        <div className="ml-auto flex items-center gap-2">
          {!isTutor && (
            <Link
              to="/credits"
              className="flex h-10 items-center gap-2 rounded-full bg-hl-soft px-4 font-display text-sm font-bold text-ink-2 transition hover:bg-hl"
              aria-label={`${credits?.balance ?? 0} crédits — acheter des crédits`}
            >
              <Coins className="h-4 w-4" />
              <span className="tabular">{credits?.balance ?? 0}</span>
              <span className="hidden sm:inline">crédits</span>
            </Link>
          )}
          <Link
            to="/notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-ink/[0.06]"
            aria-label={unread ? `${unread} notifications non lues` : "Notifications"}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[10px] font-bold leading-none text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
