import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(request) {
  const requestHeaders = new Headers(request.headers);
  const secret = requestHeaders.get("x-vercel-reval-key");

  if (secret !== process.env.CONTENTFUL_REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  revalidateTag("pages", { expire: 0 });
  revalidateTag("info", { expire: 0 });
  revalidateTag("projects", { expire: 0 });
  revalidateTag("collections", { expire: 0 });
  revalidateTag("projectSections", { expire: 0 });
  revalidateTag("site", { expire: 0 });

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
