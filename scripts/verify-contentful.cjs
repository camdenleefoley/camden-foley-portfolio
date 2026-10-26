// Run in Vercel's build environment. Never print credentials or content fields.
async function main() {
  const environment = process.env.CONTENTFUL_ENVIRONMENT_ID;
  if (!environment || !process.env.CONTENTFUL_SPACE_ID) {
    throw new Error(
      "Explicit Contentful environment configuration is required",
    );
  }
  console.log(JSON.stringify({ configuredSpace: process.env.CONTENTFUL_SPACE_ID, configuredEnvironment: environment, whitespaceInSpace: process.env.CONTENTFUL_SPACE_ID !== process.env.CONTENTFUL_SPACE_ID.trim(), whitespaceInEnvironment: environment !== environment.trim() }));
  const endpoint = `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${environment}`;
  for (const [mode, token] of [
    ["published", process.env.CONTENTFUL_ACCESS_TOKEN],
    ["preview", process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN],
  ]) {
    if (!token) throw new Error(`Missing Contentful ${mode} credential`);
    const preview = mode === "preview";
    const query = `{ siteCollection(limit: 1, preview: ${preview}) { total } projectCollection(limit: 1, preview: ${preview}) { total } pageCollection(limit: 1, preview: ${preview}) { total } }`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    if (
      !response.ok ||
      result.errors ||
      !result.data?.siteCollection?.total ||
      !result.data?.projectCollection?.total
    ) {
      const details = (result.errors || [])
        .map((error) =>
          String(
            error.message || error.extensions?.code || "Unknown GraphQL error",
          ).replaceAll(token, "[redacted]"),
        )
        .join("; ");
      throw new Error(
        `Contentful ${mode} read failed for ${environment}: HTTP ${response.status}; ${details}`,
      );
    }
    console.log(
      JSON.stringify({
        contentfulCheck: "passed",
        environment,
        mode,
        sites: result.data.siteCollection.total,
        projects: result.data.projectCollection.total,
        pages: result.data.pageCollection.total,
      }),
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
