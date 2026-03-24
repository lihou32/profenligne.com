import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type AppRole = "admin" | "student" | "tutor";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<void>;
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

  const fetchProfileAndRoles = async (userId: string) => {
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    // Si le profil n'existe pas encore (trigger DB pas encore exécuté après signup),
    // on réessaie une fois après 1s. PGRST116 = "not found" avec single()
    const notFound = !profileRes.data && profileRes.error?.code === "PGRST116";
    if (notFound) {
      await new Promise((r) => setTimeout(r, 1000));
      const retry = await supabase.from("profiles").select("*").eq("user_id", userId).single();
      if (retry.data) setProfile(retry.data);
    } else if (profileRes.data) {
      setProfile(profileRes.data);
    }

    if (rolesRes.data) setRoles(rolesRes.data.map((r) => r.role as AppRole));
  };

  useEffect(() => {
    // Safety fallback: never block the UI for more than 5 s due to auth hanging
    const safetyTimer = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        try {
          if (session?.user) {
            await fetchProfileAndRoles(session.user.id);
          } else {
            setProfile(null);
            setRoles([]);
          }
        } catch (err) {
          console.warn("Auth state change error:", err);
        } finally {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Must await so roles are populated before setLoading(false),
        // otherwise ProtectedRoute sees roles=[] and redirects prematurely.
        try {
          await fetchProfileAndRoles(session.user.id);
        } catch (err) {
          console.warn("getSession fetchProfileAndRoles error:", err);
        }
      }
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signUp, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
