// Exercise the built app locally. Credentials and private content are never logged.
const { spawn } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  for (const key of [
    "SESSION_SECRET",
    "SITE_PASSWORD",
    "CONTENTFUL_SPACE_ID",
    "CONTENTFUL_ACCESS_TOKEN",
    "CONTENTFUL_PREVIEW_SECRET",
    "CONTENTFUL_REVALIDATE_SECRET",
  ]) {
    check(
      Boolean(process.env[key]),
      `Missing required build-check configuration: ${key}`,
    );
  }
  const environment = process.env.CONTENTFUL_ENVIRONMENT_ID || "master";
  const graph = await fetch(
    `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${environment}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CONTENTFUL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        query:
          "{ projectCollection(limit: 100, where: {slug_exists: true}) { items { slug locked passwordsCollection(limit: 10) { items { value } } } } }",
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  const data = await graph.json();
  check(
    graph.ok && Array.isArray(data.data?.projectCollection?.items),
    "Contentful build-check fixtures unavailable",
  );
  const projects = data.data.projectCollection.items.filter(Boolean);
  const locked = projects.find((project) => project.locked);
  const projectFixture = projects.find(
    (project) =>
      project.locked &&
      project.passwordsCollection?.items?.some((item) => item?.value),
  );
  const publicProject = projects.find((project) => !project.locked);
  check(Boolean(publicProject), "Published public project fixture unavailable");
  const origin = "http://127.0.0.1:3197";
  const server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3197",
    ],
    {
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  for (const stream of [server.stdout, server.stderr]) {
    stream.on("data", (chunk) => {
      output = (output + chunk.toString()).slice(-32000);
    });
  }
  let count = 0;
  const request = (path, options = {}) =>
    fetch(origin + path, {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
  const post = (path, body, extra = {}) =>
    request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extra },
      body: JSON.stringify(body),
    });
  const cookieHeader = (response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
  const privatePath = (project) =>
    `/projects/${project.slug.replace(/^\/+/, "")}`;
  const isBlocked = (response) =>
    [307, 308].includes(response.status) &&
    response.headers.get("location") === "/";
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null)
        throw new Error("Local built-app server exited");
      try {
        ready = (await request("/api/draft")).status === 400;
      } catch {}
      if (ready) break;
      await delay(500);
    }
    check(ready, "Local built-app server did not start");

    const wrong = await post("/api/projects", {
      password: randomBytes(32).toString("hex"),
    });
    check(wrong.status === 401, "Invalid password was not rejected");
    count++;
    check(
      (await post("/api/projects", {})).status === 401,
      "Missing password was not rejected",
    );
    count++;
    check(
      (
        await post(
          "/api/projects",
          { password: "invalid" },
          { Origin: "https://other.example" },
        )
      ).status === 403,
      "Cross-origin login was not rejected",
    );
    count++;

    const siteLogin = await post("/api/projects", {
      password: process.env.SITE_PASSWORD,
    });
    check(siteLogin.status === 200, "Existing site password login failed");
    const siteCookies = siteLogin.headers.getSetCookie();
    check(
      siteCookies.some(
        (cookie) =>
          /HttpOnly/i.test(cookie) &&
          /Secure/i.test(cookie) &&
          /SameSite=Lax/i.test(cookie) &&
          /Path=\//i.test(cookie),
      ),
      "Session cookie attributes missing",
    );
    const siteCookie = cookieHeader(siteLogin);
    count++;
    const name = process.env.PASSWORD_COOKIE_NAME || "portfolio_access";
    if (locked) {
      check(
        isBlocked(await request(privatePath(locked))),
        "Locked page allowed anonymous access",
      );
      count++;
      check(
        isBlocked(
          await request(privatePath(locked), {
            headers: { Cookie: `${name}=true` },
          }),
        ),
        "Legacy site cookie bypassed the lock",
      );
      count++;
      check(
        isBlocked(
          await request(privatePath(locked), {
            headers: {
              Cookie: `unlocked_projects=${encodeURIComponent(JSON.stringify([locked.slug]))}`,
            },
          }),
        ),
        "Unsigned project cookie bypassed the lock",
      );
      count++;
      check(
        (
          await request(privatePath(locked), {
            headers: { Cookie: siteCookie },
          })
        ).status === 200,
        "Valid site session failed to unlock a project",
      );
      count++;
    }
    if (projectFixture) {
      const password = projectFixture.passwordsCollection.items.find(
        (item) => item?.value,
      ).value;
      const login = await post("/api/projects", {
        password,
        projectSlug: projectFixture.slug,
      });
      check(login.status === 200, "Existing project password login failed");
      const projectCookie = cookieHeader(login);
      check(
        (
          await request(privatePath(projectFixture), {
            headers: { Cookie: projectCookie },
          })
        ).status === 200,
        "Project session did not unlock its page",
      );
      count++;
      const unrelated = projects.find(
        (project) =>
          project.locked &&
          project.slug !== projectFixture.slug &&
          !project.passwordsCollection?.items?.some(
            (item) => item?.value === password,
          ),
      );
      if (unrelated) {
        check(
          isBlocked(
            await request(privatePath(unrelated), {
              headers: { Cookie: projectCookie },
            }),
          ),
          "Project session unlocked an unrelated page",
        );
        count++;
      }
    }
    const logout = await post(
      "/api/projects/clear",
      {},
      { Cookie: siteCookie },
    );
    check(
      logout.status === 200 &&
        logout.headers
          .getSetCookie()
          .filter((cookie) => /expires=Thu, 01 Jan 1970/i.test(cookie))
          .length === 2,
      "Logout did not clear both sessions",
    );
    count++;
    const slug = publicProject.slug.replace(/^\/+/, "");
    const draft = new URL("/api/draft", origin);
    draft.searchParams.set("secret", process.env.CONTENTFUL_PREVIEW_SECRET);
    draft.searchParams.set("slug", slug);
    const preview = await fetch(draft, {
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    check(
      preview.status === 307 &&
        preview.headers.get("location") === `/projects/${slug}` &&
        preview.headers.get("set-cookie")?.includes("__prerender_bypass"),
      "Draft preview redirect/cookie failed",
    );
    count++;
    const refresh = await request("/api/revalidation", {
      method: "POST",
      headers: {
        "x-vercel-reval-key": process.env.CONTENTFUL_REVALIDATE_SECRET,
      },
    });
    check(
      refresh.status === 200 && (await refresh.json()).revalidated === true,
      "Publishing refresh failed",
    );
    count++;
    for (const path of ["/", "/info", privatePath(publicProject)]) {
      check(
        (await request(path)).status === 200,
        "Public route smoke check failed",
      );
      count++;
    }
    for (const path of [
      "/opengraph-image",
      `${privatePath(publicProject)}/opengraph-image`,
    ]) {
      const image = await request(path);
      const bytes = Buffer.from(await image.arrayBuffer());
      check(
        image.status === 200 &&
          image.headers.get("content-type")?.includes("image/png") &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        "Generated social image check failed",
      );
      count++;
    }
    check(
      !/revalidateTag.*deprecated|Edge Runtime is deprecated/.test(output),
      "Deprecated runtime/cache warning remains",
    );
    console.log(
      JSON.stringify({
        builtAppChecks: "passed",
        checks: count,
        lockedPageTested: Boolean(locked),
        projectPasswordTested: Boolean(projectFixture),
      }),
    );
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  // Only our check descriptions are printed; never dump HTTP errors or server output.
  console.error(
    "Built-app verification failed:",
    error instanceof TypeError ? "network/request failure" : error.message,
  );
  process.exitCode = 1;
});
