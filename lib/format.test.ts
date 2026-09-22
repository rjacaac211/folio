import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format";

const now = new Date("2026-06-15T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it.each([
    ["just now", 30 * SECOND],
    ["3m ago", 3 * MINUTE],
    ["5h ago", 5 * HOUR],
    ["yesterday", 30 * HOUR],
    ["4d ago", 4 * DAY],
  ])("renders %s", (expected, elapsed) => {
    expect(formatRelativeTime(ago(elapsed), now)).toBe(expected);
  });

  it("falls back to a date beyond a week", () => {
    expect(formatRelativeTime(ago(30 * DAY), now)).toMatch(/May/);
  });

  it("includes the year only when it differs from now", () => {
    expect(formatRelativeTime(new Date("2024-03-02T12:00:00Z"), now)).toMatch(/2024/);
    expect(formatRelativeTime(new Date("2026-03-02T12:00:00Z"), now)).not.toMatch(/2026/);
  });

  it("accepts an ISO string", () => {
    expect(formatRelativeTime(ago(3 * MINUTE).toISOString(), now)).toBe("3m ago");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatRelativeTime("not a date", now)).toBe("");
  });
});
