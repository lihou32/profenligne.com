import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/** Pages d'élève (réserver, recharger, s'abonner…) : un compte prof est renvoyé ailleurs. */
export function StudentOnly({ children, tutorRedirect = "/dashboard" }: { children: ReactNode; tutorRedirect?: string }) {
  const { user, mode, loading } = useAuth();
  if (!loading && user && mode === "tutor") return <Navigate to={tutorRedirect} replace />;
  return <>{children}</>;
}
