import { cookies } from "next/headers";
import { getProject, getAllProjects } from "@/lib/api/projects";
import {
  createSession,
  hasSameOrigin,
  matchingProjectSlugs,
  passwordMatches,
  readSession,
  sessionCookieOptions,
  sessionIsConfigured,
  siteCookieName,
} from "@/lib/utils/signed-session.mjs";

export async function POST(request) {
  if (!hasSameOrigin(request))
    return new Response("Invalid origin", { status: 403 });
  if (!sessionIsConfigured()) {
    return new Response("Login temporarily unavailable", { status: 503 });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
  const password = data?.password;
  const projectSlug = data?.projectSlug;
  if (typeof password !== "string" || !password || password.length > 512) {
    return new Response("incorrect password", { status: 401 });
  }
  const store = await cookies();
  const options = sessionCookieOptions();
  if (passwordMatches(password, process.env.SITE_PASSWORD)) {
    store.set(siteCookieName(), createSession("site"), options);
    return new Response("password correct", { status: 200 });
  }
  if (typeof projectSlug === "string" && projectSlug.length <= 512) {
    try {
      const project = await getProject(projectSlug.replace(/^\/+/, ""));
      if (matchingProjectSlugs(project ? [project] : [], password).length) {
        // Only extend projects from a verified session, never browser-supplied JSON.
        const existing =
          readSession(store.get("unlocked_projects")?.value, "projects")
            ?.projects ?? [];
        const matching = matchingProjectSlugs(await getAllProjects(), password);
        store.set(
          "unlocked_projects",
          createSession("projects", [
            ...new Set([...existing, ...matching, project.slug]),
          ]),
          options,
        );
        return new Response("password correct", { status: 200 });
      }
    } catch {
      return new Response("Login temporarily unavailable", { status: 503 });
    }
  }
  return new Response("incorrect password", { status: 401 });
}
