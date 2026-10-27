import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const SESSION_MAX_AGE = 8 * 60 * 60;

export function sessionIsConfigured() {
  return (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}

export function passwordMatches(candidate, expected) {
  if (
    typeof candidate !== "string" ||
    !candidate ||
    typeof expected !== "string" ||
    !expected
  ) {
    return false;
  }
  const digest = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}

function validProjects(projects) {
  return (
    Array.isArray(projects) &&
    projects.length <= 100 &&
    projects.every(
      (slug) =>
        typeof slug === "string" && slug.startsWith("/") && slug.length <= 512,
    )
  );
}

function signature(message) {
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(message)
    .digest();
}

export function createSession(scope, projects = [], now = Date.now()) {
  if (!sessionIsConfigured())
    throw new Error("Session signing is not configured");
  if (!["site", "projects"].includes(scope) || !validProjects(projects)) {
    throw new Error("Invalid session scope");
  }
  const payload = Buffer.from(
    JSON.stringify({
      scope,
      projects: scope === "projects" ? [...new Set(projects)] : [],
      exp: Math.floor(now / 1000) + SESSION_MAX_AGE,
    }),
  ).toString("base64url");
  const message = `v1.${payload}`;
  const token = `${message}.${signature(message).toString("base64url")}`;
  if (token.length > 3800) throw new Error("Session exceeds cookie capacity");
  return token;
}

export function readSession(token, scope, now = Date.now()) {
  if (
    !sessionIsConfigured() ||
    typeof token !== "string" ||
    token.length > 3800
  ) {
    return null;
  }
  try {
    const parts = token.split(".");
    if (
      parts.length !== 3 ||
      parts[0] !== "v1" ||
      !/^[A-Za-z0-9_-]+$/.test(parts[1]) ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[2])
    ) {
      return null;
    }
    const expected = signature(`${parts[0]}.${parts[1]}`);
    const received = Buffer.from(parts[2], "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected) ||
      received.toString("base64url") !== parts[2]
    ) {
      return null;
    }
    const session = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    const seconds = Math.floor(now / 1000);
    if (
      session.scope !== scope ||
      !Number.isSafeInteger(session.exp) ||
      session.exp <= seconds ||
      session.exp > seconds + SESSION_MAX_AGE + 60 ||
      !validProjects(session.projects)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function siteCookieName() {
  return process.env.PASSWORD_COOKIE_NAME || "portfolio_access";
}

export function matchingProjectSlugs(projects, password) {
  return (projects || [])
    .filter(Boolean)
    .filter((project) =>
      project.passwordsCollection?.items?.some((item) =>
        passwordMatches(password, item?.value),
      ),
    )
    .map((project) => project.slug)
    .filter((slug) => typeof slug === "string" && slug.startsWith("/"));
}

export function hasSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const incoming = new URL(request.url);
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
      request.headers.get("host") ||
      incoming.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      incoming.protocol.slice(0, -1);
    const source = new URL(origin);
    return (
      source.host.toLowerCase() === host.toLowerCase() &&
      source.protocol === `${protocol}:`
    );
  } catch {
    return false;
  }
}
