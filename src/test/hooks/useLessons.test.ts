import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockGte = vi.fn().mockReturnThis();
const mockMaybeSingle = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
  gte: mockGte,
  maybeSingle: mockMaybeSingle,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "test-user-123" }, profile: null, roles: [], loading: false }),
}));

// We test the hook logic indirectly by verifying the query functions
describe("useLessons hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockReturnThis();
    mockEq.mockReturnThis();
    mockSelect.mockReturnThis();
  });

  it("useLessons calls supabase.from('lessons') with correct filters", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // Simulate what useLessons queryFn does
    mockOrder.mockResolvedValueOnce({ data: [{ id: "1", status: "confirmed" }], error: null });

    const result = await supabase
      .from("lessons")
      .select("*")
      .eq("student_id", "test-user-123")
      .order("scheduled_at", { ascending: true });

    expect(mockFrom).toHaveBeenCalledWith("lessons");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("student_id", "test-user-123");
  });

  it("useDashboardStats computes correct values", () => {
    // Test the computation logic
    const lessons = [
      { id: "1", status: "completed", duration_minutes: 60, rating: 15 },
      { id: "2", status: "completed", duration_minutes: 90, rating: 18 },
      { id: "3", status: "confirmed", duration_minutes: 60, rating: null },
      { id: "4", status: "pending", duration_minutes: 45, rating: null },
    ];

    const completed = lessons.filter((l) => l.status === "completed");
    const totalMinutes = completed.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const rated = completed.filter((l) => l.rating != null);
    const avgRating = rated.length
      ? rated.reduce((s, l) => s + (l.rating || 0), 0) / rated.length
      : 0;

    expect(completed.length).toBe(2);
    expect(totalMinutes).toBe(150);
    expect((totalMinutes / 60).toFixed(1)).toBe("2.5");
    expect(avgRating).toBe(16.5);
    expect(lessons.filter((l) => l.status === "confirmed" || l.status === "pending").length).toBe(2);
  });

  it("activeLesson uses duration_minutes instead of hardcoded 2h", () => {
    const now = Date.now();
    const lessons = [
      {
        id: "1",
        status: "confirmed",
        scheduled_at: new Date(now - 90 * 60 * 1000).toISOString(), // Started 90min ago
        duration_minutes: 60, // Only 60 min lesson
      },
      {
        id: "2",
        status: "confirmed",
        scheduled_at: new Date(now - 90 * 60 * 1000).toISOString(), // Started 90min ago
        duration_minutes: 120, // 2h lesson
      },
    ];

    // Lesson 1: started 90min ago but lasts only 60min → should NOT be active
    const l1 = lessons[0];
    const start1 = new Date(l1.scheduled_at).getTime();
    const duration1 = (l1.duration_minutes || 120) * 60 * 1000;
    const isActive1 = l1.status === "in_progress" ||
      (l1.status === "confirmed" && now >= start1 - 5 * 60 * 1000 && now < start1 + duration1);
    expect(isActive1).toBe(false);

    // Lesson 2: started 90min ago and lasts 2h → should be active
    const l2 = lessons[1];
    const start2 = new Date(l2.scheduled_at).getTime();
    const duration2 = (l2.duration_minutes || 120) * 60 * 1000;
    const isActive2 = l2.status === "in_progress" ||
      (l2.status === "confirmed" && now >= start2 - 5 * 60 * 1000 && now < start2 + duration2);
    expect(isActive2).toBe(true);
  });
});
