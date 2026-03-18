import { useAuth } from "@/hooks/useAuth";
import TutorLessons from "./TutorLessons";
import StudentLessons from "./StudentLessons";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Lessons() {
  useDocumentTitle("Mes Cours");
  const { hasRole } = useAuth();

  if (hasRole("tutor")) {
    return <TutorLessons />;
  }

  return <StudentLessons />;
}
