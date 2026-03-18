import { useAuth } from "@/hooks/useAuth";
import TutorDashboard from "./TutorDashboard";
import StudentDashboard from "./StudentDashboard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Dashboard() {
  useDocumentTitle("Tableau de bord");
  const { hasRole } = useAuth();

  if (hasRole("tutor")) {
    return <TutorDashboard />;
  }

  return <StudentDashboard />;
}
