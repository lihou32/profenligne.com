import { useAuth } from "@/hooks/useAuth";
import TutorLessons from "./TutorLessons";
import StudentLessons from "./StudentLessons";

export default function Lessons() {
  const { hasRole } = useAuth();

  if (hasRole("tutor")) {
    return <TutorLessons />;
  }

  return <StudentLessons />;
}
