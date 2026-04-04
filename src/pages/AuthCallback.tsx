import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Dedicated OAuth callback page.
 * Supabase redirects here after the provider consent screen.
 * The Supabase JS client detects the auth code / tokens in the URL
 * and exchanges them for a session before we navigate to /dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the URL params (code or tokens)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error.message);
          navigate("/login", { replace: true });
          return;
        }

        if (data.session) {
          // Session established successfully
          navigate("/dashboard", { replace: true });
        } else {
          // No session — try exchanging code from URL
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");

          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error("Code exchange error:", exchangeError.message);
              navigate("/login", { replace: true });
              return;
            }
            navigate("/dashboard", { replace: true });
          } else {
            // Check hash fragment for implicit flow tokens
            const hashParams = new URLSearchParams(
              window.location.hash.substring(1),
            );
            if (hashParams.get("access_token")) {
              // Supabase should auto-detect hash tokens, wait a moment
              await new Promise((r) => setTimeout(r, 1000));
              const { data: retryData } = await supabase.auth.getSession();
              if (retryData.session) {
                navigate("/dashboard", { replace: true });
                return;
              }
            }
            console.error("No auth code or tokens found in URL");
            navigate("/login", { replace: true });
          }
        }
      } catch (err) {
        console.error("Auth callback unexpected error:", err);
        navigate("/login", { replace: true });
      }
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
