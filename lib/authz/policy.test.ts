import { describe, expect, it } from "vitest";
import { can, denialStatus, roleFor, type Capability, type DocumentRole } from "./policy";

const OWNER = "user-ava";
const EDITOR = "user-ben";
const VIEWER = "user-mia";
const STRANGER = "user-nobody";

const document = { ownerId: OWNER };
const shares = [
  { userId: EDITOR, role: "EDITOR" as const },
  { userId: VIEWER, role: "VIEWER" as const },
];

describe("roleFor", () => {
  it("identifies the owner", () => {
    expect(roleFor(document, shares, OWNER)).toBe("OWNER");
  });

  it("identifies shared roles", () => {
    expect(roleFor(document, shares, EDITOR)).toBe("EDITOR");
    expect(roleFor(document, shares, VIEWER)).toBe("VIEWER");
  });

  it("gives a stranger no role", () => {
    expect(roleFor(document, shares, STRANGER)).toBeNull();
  });

  it("gives a signed-out visitor no role", () => {
    expect(roleFor(document, shares, null)).toBeNull();
    expect(roleFor(document, shares, undefined)).toBeNull();
  });

  it("keeps the owner an owner even if a share row also names them", () => {
    // Guards against a downgrade: sharing a document with yourself must not
    // reduce your own access to VIEWER.
    const selfShared = [...shares, { userId: OWNER, role: "VIEWER" as const }];
    expect(roleFor(document, selfShared, OWNER)).toBe("OWNER");
  });

  it("returns no role once a share is revoked", () => {
    const revoked = shares.filter((share) => share.userId !== VIEWER);
    expect(roleFor(document, revoked, VIEWER)).toBeNull();
  });
});

describe("the permission matrix", () => {
  // Every role against every capability, stated explicitly. A future change
  // that widens a role has to edit this table, which is the point.
  const matrix: Array<[DocumentRole | null, Capability, boolean]> = [
    ["OWNER", "read", true],
    ["OWNER", "write", true],
    ["OWNER", "share", true],
    ["OWNER", "delete", true],

    ["EDITOR", "read", true],
    ["EDITOR", "write", true],
    ["EDITOR", "share", false],
    ["EDITOR", "delete", false],

    ["VIEWER", "read", true],
    ["VIEWER", "write", false],
    ["VIEWER", "share", false],
    ["VIEWER", "delete", false],

    [null, "read", false],
    [null, "write", false],
    [null, "share", false],
    [null, "delete", false],
  ];

  it.each(matrix)("%s can %s: %s", (role, capability, expected) => {
    expect(can(role, capability)).toBe(expected);
  });

  it("lets only the owner reshare or delete", () => {
    const roles: DocumentRole[] = ["OWNER", "EDITOR", "VIEWER"];
    expect(roles.filter((role) => can(role, "share"))).toEqual(["OWNER"]);
    expect(roles.filter((role) => can(role, "delete"))).toEqual(["OWNER"]);
  });
});

describe("denialStatus", () => {
  it("hides existence from someone with no access", () => {
    expect(denialStatus(null)).toBe(404);
  });

  it("is honest with someone who can already see the document", () => {
    expect(denialStatus("VIEWER")).toBe(403);
    expect(denialStatus("EDITOR")).toBe(403);
    expect(denialStatus("OWNER")).toBe(403);
  });
});
