import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mesh-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground animate-fade-in">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/30 px-4 bg-background/50 backdrop-blur-lg">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground transition-colors" />
        </header>
        <main className="flex-1 overflow-auto p-6 mesh-bg">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
