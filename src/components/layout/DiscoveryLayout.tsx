import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "./AppLayout";
import { PublicLayout } from "./PublicLayout";

/** Pages ouvertes à tous (liste des profs, direct, abonnement) : dans l'espace
 *  connecté (menu à gauche) quand on est connecté, sinon en version publique. */
export function DiscoveryLayout() {
  const { user } = useAuth();
  return user ? <AppLayout /> : <PublicLayout />;
}
