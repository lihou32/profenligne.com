import { describe, expect, it } from "vitest";
import { LocalRoomTransport } from "@/lib/room/transport";

const tick = () => new Promise((r) => setTimeout(r, 20));

describe("canal de la salle (transport local)", () => {
  it("distribue les messages aux autres, jamais à soi-même, et respecte le destinataire", async () => {
    const a = new LocalRoomTransport("t1", "a");
    const b = new LocalRoomTransport("t1", "b");
    const c = new LocalRoomTransport("t1", "c");
    const got: Record<string, string[]> = { a: [], b: [], c: [] };
    for (const [id, t] of [["a", a], ["b", b], ["c", c]] as const) t.on("hello", (m) => got[id].push(`${m.from}`));
    a.send({ type: "hello" });
    b.send({ type: "hello", to: "a" });
    await tick();
    expect(got.a).toEqual(["b"]);
    expect(got.b).toEqual(["a"]);
    expect(got.c).toEqual(["a"]);
    [a, b, c].forEach((t) => t.close());
  });

  it("le désabonnement coupe la réception", async () => {
    const a = new LocalRoomTransport("t2", "a");
    const b = new LocalRoomTransport("t2", "b");
    const seen: string[] = [];
    const off = b.on("board", (m) => seen.push(m.type));
    a.send({ type: "board" });
    await tick();
    off();
    a.send({ type: "board" });
    await tick();
    expect(seen).toEqual(["board"]);
    a.close();
    b.close();
  });
});
