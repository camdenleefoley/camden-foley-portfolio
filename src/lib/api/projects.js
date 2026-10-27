import { fetchGraphQL, extractEntries } from "@/lib/utils/contentful";

const ALL_PROJECT_GRAPHQL_FIELDS = `
  sys {
    id
  }
  name
  mobileName
  slug
  date
  client
  locked
  tags
  heroImage {
    url
    width
    height
    description
  }
  passwordsCollection(limit: 10) {
    items {
      value
    }
  }
`;

const PROJECT_GRAPHQL_FIELDS = `
  sys {
    id
  }
  name
  slug
  date
  description
  client
  locked
  tags
  brief {
    json
  }
  role {
    json
  }
  highlights {
    json
  }
  closing {
    json
  }
  heroImage {
    url
    width
    height
    description
  }
  sectionsCollection(limit: 25) {
    items {
      sys {
        id
      }
    }
  }
  processSlidesCollection(limit: 50) {
    items {
      sys {
        id
      }
        url
        width
        height
        description
    }
  }
  passwordsCollection(limit: 10) {
    items {
      value
    }
  }
`;

export async function getAllProjects(limit = 100, isDraftMode = false) {
  // TODO
  const query = `query {
        projectCollection(where:{slug_exists: true}, order: date_DESC, limit: ${limit}, preview: ${
          isDraftMode ? "true" : "false"
        }) {
          items {
            ${ALL_PROJECT_GRAPHQL_FIELDS}
          }
        }
      }`;

  const projects = await fetchGraphQL(query, isDraftMode, ["projects"]);
  return extractEntries(projects, "projectCollection");
}

export async function getProject(slug, isDraftMode = false) {
  const contentfulSlug = JSON.stringify(`/${slug.replace(/^\/+/, "")}`);
  const query = `query {
        projectCollection(where:{slug: ${contentfulSlug}}, limit: 1, preview: ${
          isDraftMode ? "true" : "false"
        }) {
          items {
            ${PROJECT_GRAPHQL_FIELDS}
          }
        }
      }`;

  const project = await fetchGraphQL(query, isDraftMode, ["projects"]);
  return extractEntries(project, "projectCollection")[0];
}

export async function getCollectionProjects(
  ids,
  limit = 10,
  isDraftMode = false,
) {
  const query = `query {
    projectCollection(where:{sys: {id_in: ["${ids.join('","')}"]}}, limit: ${limit}, preview: ${
      isDraftMode ? "true" : "false"
    }) {
            items {
                ${ALL_PROJECT_GRAPHQL_FIELDS}
            }
        }
    }`;
  const projects = await fetchGraphQL(query, isDraftMode, ["projects"]);
  return extractEntries(projects, "projectCollection");
}
