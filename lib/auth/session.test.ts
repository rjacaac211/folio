import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken } from "./session";

const SECRET = "test-secret-not-used-anywhere-else";
const OTHER_SECRET = "a-different-secret";
const USER_ID = "clx0a1b2c3d4e5f6g7h8i9j0";

describe("session tokens", () => {
  it("round-trips a user id", () => {
    const token = createSessionToken(USER_ID, SECRET);
    expect(readSessionToken(token, SECRET)).toBe(USER_ID);
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken(USER_ID, OTHER_SECRET);
    expect(readSessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a token whose user id was swapped for another", () => {
    const token = createSessionToken(USER_ID, SECRET);
    const signature = token.slice(token.lastIndexOf(".") + 1);
    const forged = `some-other-user-id.${signature}`;
    expect(readSessionToken(forged, SECRET)).toBeNull();
  });

  it("rejects a token whose signature was altered", () => {
    const token = createSessionToken(USER_ID, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(readSessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on length mismatch; the guard must catch this first.
    expect(() => readSessionToken(`${USER_ID}.short`, SECRET)).not.toThrow();
    expect(readSessionToken(`${USER_ID}.short`, SECRET)).toBeNull();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["an empty string", ""],
    ["a value with no separator", "justsomestring"],
    ["a value with no user id", ".signature"],
    ["a value with no signature", "user-id."],
  ])("rejects %s", (_label, value) => {
    expect(readSessionToken(value, SECRET)).toBeNull();
  });

  it("does not put the secret in the token", () => {
    expect(createSessionToken(USER_ID, SECRET)).not.toContain(SECRET);
  });
});
