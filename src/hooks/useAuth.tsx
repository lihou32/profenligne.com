import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "student" | "tutor";

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, string>,
  ) => Promise<User | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  // ── FIX: AbortController pour éviter les race conditions ──
  const fetchControllerRef = useRef<AbortController | null>(null);

  const fetchProfileAndRoles = async (userId: string) => {
    // Annuler toute requête précédente encore en cours
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    // FIX: Promise.allSettled au lieu de Promise.all
    // → si une requête échoue, l'autre continue
    const [profileResult, rolesResult] = await Promise.allSettled([
      supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, avatar_url")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId),
    ]);

    // Si annulé entre-temps (nouvelle session arrivée), on ignore
    if (controller.signal.aborted) return;

    // Traitement du profil
    if (profileResult.status === "fulfilled") {
      const { data, error } = profileResult.value;
      const notFound = !data && error?.code === "PGRST116";

      if (notFound) {
        // FIX: Retry avec limite (1 seul retry, pas de boucle infinie)
        await new Promise((r) => setTimeout(r, 1500));
        if (controller.signal.aborted) return;

        const retry = await supabase
          .from("profiles")
          .select("id, user_id, first_name, last_name, avatar_url")
          .eq("user_id", userId)
          .single();

        if (!controller.signal.aborted && retry.data) {
          setProfile(retry.data as Profile);
        }
      } else if (data) {
        setProfile(data as Profile);
      }
    }

    // Traitement des rôles
    if (rolesResult.status === "fulfilled" && rolesResult.value.data) {
      if (!controller.signal.aborted) {
        setRoles(
          rolesResult.value.data.map(
            (r: { role: string }) => r.role as AppRole,
          ),
        );
      }
    }
  };

  useEffect(() => {
    // Safety fallback: jamais bloquer l'UI plus de 5s
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    // FIX: On s'appuie UNIQUEMENT sur onAuthStateChange.
    // L'event INITIAL_SESSION fournit la session initiale — plus besoin de getSession().
    // Cela élimine la race condition entre les deux appels concurrents.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Sentry: identifier l'utilisateur pour le suivi d'erreurs
      if (newSession?.user) {
        const { setUser: setSentryUser } = await import("@sentry/react");
        setSentryUser({ id: newSession.user.id, email: newSession.user.email });
      } else {
        const { setUser: setSentryUser } = await import("@sentry/react");
        setSentryUser(null);
      }

      // Ignorer TOKEN_REFRESHED — la session est la même, pas besoin de refetch
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      try {
        if (newSession?.user) {
          await fetchProfileAndRoles(newSession.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
      } catch {
        // Auth state change non-critique : on ne crash pas l'app
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
      // Annuler les requêtes en cours au démontage
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }
    };
  }, []);

  // ── Sanitize metadata pour éviter XSS via signup ──
  const sanitize = (val: string): string =>
    val
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, string>,
  ) => {
    // FIX: Validation + sanitisation des métadonnées utilisateur
    const cleanMeta = metadata
      ? Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [
            sanitize(k),
            sanitize(String(v).slice(0, 500)), // Limite 500 chars par champ
          ]),
        )
      : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: cleanMeta,
      },
    });
    if (error) throw error;
    return data.user;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    // Nettoyer l'état local avant le signOut pour éviter flash
    setProfile(null);
    setRoles([]);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        signUp,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
