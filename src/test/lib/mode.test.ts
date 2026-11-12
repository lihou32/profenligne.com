import { describe, expect, it } from "vitest";
import { resolveMode } from "@/lib/mode";

describe("espace élève / prof", () => {
  it("un compte prof voit l'espace prof, les autres l'espace élève", () => {
    expect(resolveMode(["tutor"])).toBe("tutor");
    expect(resolveMode(["admin", "tutor"])).toBe("tutor");
    expect(resolveMode(["student"])).toBe("student");
    expect(resolveMode(["admin", "student"])).toBe("student");
    expect(resolveMode([])).toBe("student");
  });
});
