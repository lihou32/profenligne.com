// Re-export all data hooks for backward compatibility.
// Prefer importing directly from the specialized hook files:
//   - useLessons.ts  (useLessons, useCreateLesson, useUpdateLesson, useDashboardStats)
//   - useTutors.ts   (useTutors, useTutorProfile, useTutorLessons, useTutorStats, useUpdateTutorStatus, useTutorReviews, useCreateReview)
//   - useNotifications.ts (useNotifications, useMarkNotificationsRead)

export {
  useLessons,
  useCreateLesson,
  useUpdateLesson,
  useDashboardStats,
} from "./useLessons";

export {
  useTutors,
  useTutorProfile,
  useTutorLessons,
  useTutorStats,
  useUpdateTutorStatus,
  useTutorReviews,
  useCreateReview,
} from "./useTutors";

export {
  useNotifications,
  useMarkNotificationsRead,
} from "./useNotifications";
