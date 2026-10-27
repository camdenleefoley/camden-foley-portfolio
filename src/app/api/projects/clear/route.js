import { cookies } from "next/headers";
import { hasSameOrigin, siteCookieName } from "@/lib/utils/signed-session.mjs";

export async function POST(request) {
  if (!hasSameOrigin(request))
    return new Response("Invalid origin", { status: 403 });
  const cookiesStore = await cookies();

  // Clear the global site password cookie
  cookiesStore.delete(siteCookieName());

  // Clear the unlocked projects cookie
  cookiesStore.delete("unlocked_projects");

  return new Response("cookies cleared", { status: 200 });
}
