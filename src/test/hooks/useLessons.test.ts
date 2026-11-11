import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

const rpc = vi.fn();
const invoke = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" }, profile: null, roles: ["student"], loading: false }),
}));

import { computeStudentStats, useCreateLesson, useCancelLesson, type Lesson } from "@/hooks/useLessons";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { mutations: { retry: false } } }) }, children);

const lesson = (over: Partial<Lesson>): Lesson => ({
  id: "l", student_id: "student-1", tutor_id: "tutor-1", subject: "Maths", topic: null,
  scheduled_at: new Date().toISOString(), duration_minutes: 60, status: "pending", notes: null,
  rating: null, room_id: "l", credits_cost: 8, started_at: null, completed_at: null, cancelled_by: null,
  created_at: "", updated_at: "", ...over,
});

describe("useLessons", () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockClear();
  });

  it("réserve via la RPC book_lesson (débit atomique des crédits côté base)", async () => {
    rpc.mockResolvedValueOnce({ data: lesson({ id: "new-lesson" }), error: null });
    const { result } = renderHook(() => useCreateLesson(), { wrapper });

    await result.current.mutateAsync({
      tutor_id: "tutor-1",
      subject: "Maths",
      topic: null,
      scheduled_at: "2030-01-01T10:00:00.000Z",
      duration_minutes: 60,
    });

    expect(rpc).toHaveBeenCalledWith("book_lesson", {
      p_tutor_id: "tutor-1",
      p_subject: "Maths",
      p_topic: "",
      p_scheduled_at: "2030-01-01T10:00:00.000Z",
      p_duration_minutes: 60,
    });
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("notify-lesson-booking", { body: { lessonId: "new-lesson" } }));
  });

  it("remonte l'erreur de la base (ex. crédits insuffisants)", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "Crédits insuffisants : il vous faut 8 crédit(s), vous en avez 0" } });
    const { result } = renderHook(() => useCreateLesson(), { wrapper });
    await expect(
      result.current.mutateAsync({ tutor_id: "t", subject: "Maths", topic: null, scheduled_at: "x", duration_minutes: 60 }),
    ).rejects.toMatchObject({ message: expect.stringContaining("Crédits insuffisants") });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("n'envoie pas d'email au prof quand c'est l'élève qui annule", async () => {
    rpc.mockResolvedValueOnce({ data: lesson({ status: "cancelled" }), error: null });
    const { result } = renderHook(() => useCancelLesson(), { wrapper });
    await result.current.mutateAsync({ id: "l", tutor_id: "tutor-1" });
    expect(rpc).toHaveBeenCalledWith("cancel_lesson", { p_lesson_id: "l" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("computeStudentStats : heures, cours terminés, note moyenne des avis", () => {
    const stats = computeStudentStats(
      [
        lesson({ id: "1", status: "completed", duration_minutes: 60 }),
        lesson({ id: "2", status: "completed", duration_minutes: 90 }),
        lesson({ id: "3", status: "confirmed" }),
        lesson({ id: "4", status: "in_progress" }),
        lesson({ id: "5", status: "cancelled" }),
      ],
      [4, 5],
    );
    expect(stats.totalHours).toBe("2.5");
    expect(stats.completedLessons).toBe(2);
    expect(stats.averageRating).toBe("4.5");
    expect(stats.upcomingLessons.map((l) => l.id)).toEqual(["3", "4"]);
  });
});
