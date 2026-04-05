import { useAuth } from "@/hooks/useAuth";
import { useTutorProfile } from "@/hooks/useTutors";
import TutorDashboard from "./TutorDashboard";
import StudentDashboard from "./StudentDashboard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  useDocumentTitle("Tableau de bord");
  const { hasRole } = useAuth();
  const isTutor = hasRole("tutor");
  const { data: tutorProfile, isLoading: tutorLoading } = useTutorProfile();

  // Tutor with role but no tutor profile row → onboarding
  if (isTutor && !tutorLoading && !tutorProfile) {
    return <Navigate to="/become-tutor" replace />;
  }

  // Tutor with profile row but no subjects/rate → also needs onboarding
  if (isTutor && tutorProfile && tutorProfile.subjects?.length === 0 && Number(tutorProfile.hourly_rate) === 0) {
    return <Navigate to="/become-tutor" replace />;
  }

  if (isTutor) {
    return <TutorDashboard />;
  }

  return <StudentDashboard />;
}
