export function extractEntries(fetchResponse, collectionKey) {
  return fetchResponse?.data[collectionKey]?.items;
}

export function getCollectionIds(collection) {
  // Unpublished/deleted linked entries surface as null items (UNRESOLVABLE_LINK) —
  // skip them so a mid-edit project doesn't break the whole collection page.
  return collection?.items?.filter(Boolean).map(({ sys }) => sys.id);
}

export async function fetchGraphQL(query, preview = false, tags = []) {
  console.log("fetch tags", tags);
  return fetch(
    `https://graphql.contentful.com/content/v1/spaces/${process.env.CONTENTFUL_SPACE_ID}/environments/${process.env.CONTENTFUL_ENVIRONMENT_ID || "master"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Switch the Bearer token depending on whether the fetch is supposed to retrieve live
        // Contentful content or draft content
        Authorization: `Bearer ${
          preview
            ? process.env.CONTENTFUL_PREVIEW_ACCESS_TOKEN
            : process.env.CONTENTFUL_ACCESS_TOKEN
        }`,
      },
      body: JSON.stringify({ query }),
      // Associate all fetches with cache tag so content can
      // be revalidated or updated from Contentful on publish
      next: { tags },
    },
  )
    .then((response) => response.json())
    .then((json) => {
      if (json.errors) {
        // Unpublished/draft linked entries (e.g. a Password mid-edit) surface as
        // UNRESOLVABLE_LINK here — expected as part of the editorial workflow, not a bug.
        const unexpected = json.errors.filter(
          (error) => error.extensions?.contentful?.code !== "UNRESOLVABLE_LINK",
        );
        if (unexpected.length) {
          console.error(
            "Contentful GraphQL errors:",
            JSON.stringify(unexpected, null, 2),
          );
        }
      }
      return json;
    })
    .catch((error) => {
      console.error("Contentful fetch error:", error);
    });
}
