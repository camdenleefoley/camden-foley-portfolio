import { ImageResponse } from "next/og";

import { getProject } from "@/lib/api/projects";

// Route segment config
export const runtime = "nodejs";

export const size = {
  width: 600,
  height: 800,
};

export const contentType = "image/png";

export default async function OpenGraphImage({ params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  const { heroImage } = project;

  return new ImageResponse(
    <img
      src={heroImage.url}
      alt={heroImage.description || project.name}
      width={size.width}
      height={size.height}
      style={{
        objectFit: "contain",
      }}
    />,
    {
      ...size,
    },
  );
}
