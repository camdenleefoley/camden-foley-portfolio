import { cookies } from "next/headers";
import { readSession, siteCookieName } from "./signed-session.mjs";

export async function isLoggedIn() {
  const cookiesStore = await cookies();
  return !!readSession(cookiesStore.get(siteCookieName())?.value, "site");
}

export async function getUnlockedProjects() {
  const cookiesStore = await cookies();
  const unlockedCookie = cookiesStore.get("unlocked_projects");
  return readSession(unlockedCookie?.value, "projects")?.projects ?? [];
}

export async function isProjectUnlocked(slug) {
  if (await isLoggedIn()) {
    return true;
  }
  const unlockedProjects = await getUnlockedProjects();
  return unlockedProjects.includes(slug);
}
