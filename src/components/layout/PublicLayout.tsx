import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Lightweight layout for public-facing discovery pages (/tutors, /tutor/:id).
 * Shows a simple navbar with login/signup CTAs for visitors,
 * or redirects into AppLayout-style nav for logged-in users.
 */
export function PublicLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Compact navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-display text-base font-bold tracking-tight">
              Prof en Ligne
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" variant="ghost">
                  Mon tableau de bord
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Connexion
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="gap-1">
                    S'inscrire <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
