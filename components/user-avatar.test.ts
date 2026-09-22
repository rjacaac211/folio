import { describe, expect, it } from "vitest";
import { initials } from "./user-avatar";

describe("initials", () => {
  it("uses first and last initial for a full name", () => {
    expect(initials("Ava Chen")).toBe("AC");
    expect(initials("Mary Jane Watson")).toBe("MW");
  });

  it("uses the first two letters of a single name", () => {
    expect(initials("Ava")).toBe("AV");
  });

  it("tolerates extra whitespace", () => {
    expect(initials("  Ben   Ortiz  ")).toBe("BO");
  });

  it("falls back for an empty name", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
