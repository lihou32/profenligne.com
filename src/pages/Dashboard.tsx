import { useAuth } from "@/hooks/useAuth";
import TutorDashboard from "./TutorDashboard";
import StudentDashboard from "./StudentDashboard";

export default function Dashboard() {
  const { hasRole } = useAuth();

  if (hasRole("tutor")) {
    return <TutorDashboard />;
  }

  return <StudentDashboard />;
}
