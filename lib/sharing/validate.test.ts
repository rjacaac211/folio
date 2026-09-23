import { describe, expect, it } from "vitest";
import { checkShareRequest, isPlausibleEmail, isShareRole, normalizeEmail } from "./validate";

describe("normalizeEmail", () => {
  it("lowercases and trims, so addresses match regardless of how they were typed", () => {
    expect(normalizeEmail("  Ava@Folio.DEV ")).toBe("ava@folio.dev");
  });
});

describe("isPlausibleEmail", () => {
  it.each(["ava@folio.dev", "a.b+tag@sub.example.co.uk", "x@y.zz"])("accepts %s", (email) => {
    expect(isPlausibleEmail(email)).toBe(true);
  });

  it.each([
    ["no at sign", "avafolio.dev"],
    ["no domain dot", "ava@folio"],
    ["an internal space", "ava name@folio.dev"],
    ["nothing before the at", "@folio.dev"],
    ["nothing after the at", "ava@"],
    ["an empty string", ""],
  ])("rejects %s", (_label, email) => {
    expect(isPlausibleEmail(email)).toBe(false);
  });

  it("rejects an absurdly long address", () => {
    expect(isPlausibleEmail(`${"a".repeat(250)}@folio.dev`)).toBe(false);
  });
});

describe("isShareRole", () => {
  it("accepts the two roles", () => {
    expect(isShareRole("VIEWER")).toBe(true);
    expect(isShareRole("EDITOR")).toBe(true);
  });

  it.each([
    ["OWNER, which cannot be granted", "OWNER"],
    ["lowercase", "editor"],
    ["an unknown role", "ADMIN"],
    ["a non-string", 1],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, value) => {
    expect(isShareRole(value)).toBe(false);
  });
});

describe("checkShareRequest", () => {
  it("accepts a valid request and returns the normalized address", () => {
    expect(checkShareRequest(" BEN@folio.dev ", "EDITOR")).toEqual({
      ok: true,
      email: "ben@folio.dev",
      role: "EDITOR",
    });
  });

  it("rejects a missing address", () => {
    expect(checkShareRequest("", "VIEWER")).toMatchObject({ ok: false, status: 400 });
    expect(checkShareRequest("   ", "VIEWER")).toMatchObject({ ok: false, status: 400 });
    expect(checkShareRequest(undefined, "VIEWER")).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects an implausible address", () => {
    expect(checkShareRequest("not-an-address", "VIEWER")).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("refuses to grant OWNER through the sharing route", () => {
    // Ownership is not a grantable role; allowing it here would be a way to
    // hand over a document without any transfer flow.
    expect(checkShareRequest("ben@folio.dev", "OWNER")).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects a missing role", () => {
    expect(checkShareRequest("ben@folio.dev", undefined)).toMatchObject({
      ok: false,
      status: 400,
    });
  });
});
