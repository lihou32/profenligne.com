import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dedicated OAuth callback page.
 * With implicit flow, tokens arrive in the URL hash fragment.
 * The Supabase JS client auto-detects them via detectSessionInUrl.
 * We just need to wait for the session to be established, then redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Give Supabase a moment to process the hash tokens
      // The client's detectSessionInUrl handles the heavy lifting
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === "SIGNED_IN" && session) {
            subscription.unsubscribe();
            navigate("/dashboard", { replace: true });
          }
        }
      );

      // Also check if session is already established
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Auth callback error:", error.message);
        navigate("/login", { replace: true });
        return;
      }

      if (data.session) {
        subscription.unsubscribe();
        navigate("/dashboard", { replace: true });
        return;
      }

      // Safety timeout: if nothing happens in 10s, go back to login
      const timeout = setTimeout(() => {
        subscription.unsubscribe();
        console.error("Auth callback timeout — no session established");
        navigate("/login", { replace: true });
      }, 10000);

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg">
      <div className="text-center">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground">Connexion en cours...</p>
      </div>
    </div>
  );
}
