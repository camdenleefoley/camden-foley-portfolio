import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  readSession,
  matchingProjectSlugs,
  passwordMatches,
  sessionCookieOptions,
  hasSameOrigin,
  SESSION_MAX_AGE,
} from "../src/lib/utils/signed-session.mjs";

process.env.SESSION_SECRET = "local-tests-only-independent-signing-key-0001";
const now = 1_800_000_000_000;

test("site login has a bounded lifetime and cannot be reused as a project session", () => {
  const token = createSession("site", [], now);
  assert.equal(readSession(token, "site", now).scope, "site");
  assert.equal(readSession(token, "projects", now), null);
  assert.equal(readSession(token, "site", now + SESSION_MAX_AGE * 1000), null);
});

test("legacy and forged browser cookies never grant access", () => {
  for (const value of [
    undefined,
    "true",
    '["/private"]',
    "v1.e30.invalid",
    "x".repeat(4000),
  ]) {
    assert.equal(readSession(value, "site", now), null);
    assert.equal(readSession(value, "projects", now), null);
  }
  const token = createSession("projects", ["/allowed"], now);
  const parts = token.split(".");
  const data = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  data.projects.push("/not-authorized");
  const forged = [
    parts[0],
    Buffer.from(JSON.stringify(data)).toString("base64url"),
    parts[2],
  ].join(".");
  assert.equal(readSession(forged, "projects", now), null);
  assert.equal(readSession(token.slice(0, -2) + "AA", "projects", now), null);
});

test("project sessions contain only their authorized projects", () => {
  const token = createSession("projects", ["/a", "/a", "/b"], now);
  assert.deepEqual(readSession(token, "projects", now).projects, ["/a", "/b"]);
  assert.equal(
    readSession(token, "projects", now).projects.includes("/c"),
    false,
  );
  assert.equal(readSession(token, "site", now), null);
});

test("missing or rotated signing keys fail closed", () => {
  const original = process.env.SESSION_SECRET;
  const token = createSession("site", [], now);
  try {
    process.env.SESSION_SECRET = "another-independent-signing-key-for-tests";
    assert.equal(readSession(token, "site", now), null);
    delete process.env.SESSION_SECRET;
    assert.equal(readSession(token, "site", now), null);
    assert.throws(() => createSession("site"));
  } finally {
    process.env.SESSION_SECRET = original;
  }
});

test("password matching preserves shared-project unlocks without accepting empty values", () => {
  const project = (slug, values) => ({
    slug,
    passwordsCollection: {
      items: values.map((value) => (value === null ? null : { value })),
    },
  });
  const projects = [
    null,
    project("/a", [null, "shared"]),
    project("/b", ["shared"]),
    project("/c", ["different"]),
    project("/d", [null, ""]),
  ];
  assert.deepEqual(matchingProjectSlugs(projects, "shared"), ["/a", "/b"]);
  assert.deepEqual(matchingProjectSlugs(projects, ""), []);
  assert.equal(passwordMatches(undefined, undefined), false);
  assert.equal(passwordMatches("correct", "different"), false);
});

test("cookies protect session values and browser mutations require same origin", () => {
  const before = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    assert.deepEqual(sessionCookieOptions(), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
  assert.equal(
    hasSameOrigin(
      new Request("https://site.example/api/projects", {
        headers: { origin: "https://site.example" },
      }),
    ),
    true,
  );
  assert.equal(
    hasSameOrigin(
      new Request("https://site.example/api/projects", {
        headers: { origin: "https://other.example" },
      }),
    ),
    false,
  );
  assert.equal(
    hasSameOrigin(
      new Request("http://internal:3000/api/projects", {
        headers: {
          host: "site.example",
          "x-forwarded-proto": "https",
          origin: "https://site.example",
        },
      }),
    ),
    true,
  );
});
