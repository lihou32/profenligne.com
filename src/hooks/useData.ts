// Point d'entrée unique des hooks de données.
// Les implémentations vivent dans les fichiers spécialisés :
//   - useLessons.ts       (cours : réservation, confirmation, annulation, démarrage, fin)
//   - useTutors.ts        (profs, avis)
//   - useNotifications.ts (notifications)

export {
  useLessons,
  useCreateLesson,
  useConfirmLesson,
  useCancelLesson,
  useStartLesson,
  useCompleteLesson,
  useDashboardStats,
} from "./useLessons";
export type { Lesson, StudentLesson, PersonSummary, BookLessonInput } from "./useLessons";

export {
  useTutors,
  useTutorProfile,
  useTutorLessons,
  useTutorStats,
  useUpdateTutorStatus,
  useTutorReviews,
  useCreateReview,
} from "./useTutors";
export type { TutorWithProfile, TutorProfileSummary } from "./useTutors";

export {
  useNotifications,
  useMarkNotificationsRead,
} from "./useNotifications";
