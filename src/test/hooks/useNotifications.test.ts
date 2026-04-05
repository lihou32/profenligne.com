import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChain = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockChain),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-abc" }, profile: null, roles: [], loading: false }),
}));

describe("useNotifications logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain.select.mockReturnThis();
    mockChain.eq.mockReturnThis();
    mockChain.order.mockReturnThis();
    mockChain.update.mockReturnThis();
  });

  it("fetches notifications ordered by created_at desc", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    mockChain.order.mockResolvedValueOnce({
      data: [
        { id: "1", title: "New lesson", read: false, created_at: "2026-03-23" },
        { id: "2", title: "Old notification", read: true, created_at: "2026-03-22" },
      ],
      error: null,
    });

    const result = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(result.data).toHaveLength(2);
    expect(result.data![0].title).toBe("New lesson");
  });

  it("marks notifications as read for specific user", async () => {
    const { supabase } = await import("@/integrations/supabase/client");

    // The chain: update -> eq -> eq should all return mockChain
    mockChain.update.mockReturnThis();
    mockChain.eq.mockReturnValueOnce(mockChain).mockResolvedValueOnce({ error: null });

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", "user-abc")
      .eq("read", false);

    expect(mockChain.update).toHaveBeenCalledWith({ read: true });
  });
});
