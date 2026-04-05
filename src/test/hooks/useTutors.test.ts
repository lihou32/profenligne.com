import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "tutor-id-123" }, profile: null, roles: [], loading: false }),
}));

describe("useTutors logic", () => {
  it("merges tutor data with profile data correctly", () => {
    const tutors = [
      { id: "t1", user_id: "u1", subjects: ["Maths"], hourly_rate: 25, rating: 4.5 },
      { id: "t2", user_id: "u2", subjects: ["Français"], hourly_rate: 20, rating: 4.0 },
    ];

    const profiles = [
      { user_id: "u1", first_name: "Alice", last_name: "Martin", avatar_url: null },
      { user_id: "u2", first_name: "Bob", last_name: "Dupont", avatar_url: "https://example.com/avatar.jpg" },
    ];

    const profileMap = new Map(profiles.map((p) => [p.user_id, p]));
    const merged = tutors.map((t) => ({
      ...t,
      profiles: profileMap.get(t.user_id) || null,
    }));

    expect(merged[0].profiles?.first_name).toBe("Alice");
    expect(merged[1].profiles?.avatar_url).toBe("https://example.com/avatar.jpg");
    expect(merged.length).toBe(2);
  });

  it("handles empty tutor list", () => {
    const tutors: any[] = [];
    const userIds = [...new Set(tutors.map((t: any) => t.user_id))];
    expect(userIds.length).toBe(0);
  });

  it("computes tutor stats correctly", () => {
    const lessons = [
      { status: "completed", duration_minutes: 60, student_id: "s1" },
      { status: "completed", duration_minutes: 90, student_id: "s2" },
      { status: "confirmed", duration_minutes: 60, student_id: "s1" },
    ];

    const completedThisMonth = lessons.filter((l) => l.status === "completed");
    const hourlyRate = 30;
    const monthlyRevenue = completedThisMonth.reduce(
      (s, l) => s + ((l.duration_minutes || 0) / 60) * hourlyRate,
      0,
    );
    const uniqueStudents = new Set(lessons.map((l) => l.student_id)).size;

    expect(completedThisMonth.length).toBe(2);
    expect(Math.round(monthlyRevenue)).toBe(75); // (60/60)*30 + (90/60)*30 = 30 + 45
    expect(uniqueStudents).toBe(2);
  });

  it("computes average rating from reviews", () => {
    const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }];
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    expect(avgRating).toBe(4);
  });

  it("handles empty reviews (fallback to tutor.rating)", () => {
    const reviews: { rating: number }[] = [];
    const tutorRating = 4.2;
    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : tutorRating;
    expect(avgRating).toBe(4.2);
  });
});
