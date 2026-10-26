// Run only in the trusted Vercel build environment. Never print credentials.
async function main() {
  const origin = "https://www.camdenleefoley.com";
  const previewSecret = process.env.CONTENTFUL_PREVIEW_SECRET;
  const revalidationSecret = process.env.CONTENTFUL_REVALIDATE_SECRET;
  if (!previewSecret || !revalidationSecret) throw new Error("Missing integration credentials");
  const draft = new URL("/api/draft", origin);
  draft.searchParams.set("secret", previewSecret);
  draft.searchParams.set("slug", "ideo-x-herschel_heritage-luggage");
  const response = await fetch(draft, { redirect: "manual", signal: AbortSignal.timeout(30000) });
  console.log(JSON.stringify({ check: "draft", status: response.status, draftCookie: Boolean(response.headers.get("set-cookie")?.includes("__prerender_bypass")), projectRedirect: Boolean(response.headers.get("location")?.endsWith("/projects/ideo-x-herschel_heritage-luggage")) }));
  if (response.status !== 307 || !response.headers.get("set-cookie")?.includes("__prerender_bypass") || response.headers.get("location") !== "/projects/ideo-x-herschel_heritage-luggage") {
    throw new Error("Draft integration check failed: HTTP " + response.status);
  }
  console.log("Draft integration check passed: redirect and draft cookie");
  const revalidation = await fetch(new URL("/api/revalidation", origin), {
    method: "POST",
    headers: { "x-vercel-reval-key": revalidationSecret },
    signal: AbortSignal.timeout(30000)
  });
  console.log(JSON.stringify({ check: "revalidation", status: revalidation.status }));
  const result = await revalidation.json();
  if (!revalidation.ok || result.revalidated !== true) throw new Error("Revalidation integration check failed: HTTP " + revalidation.status);
  console.log("Revalidation integration check passed: HTTP " + revalidation.status);
}
main().catch(() => {
  console.error("Live integration check failed; inspect endpoint status without printing credentials");
  process.exitCode = 1;
});
