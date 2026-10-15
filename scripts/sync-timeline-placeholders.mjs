import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

const collections = [
  {
    slug: "featured",
    title: "Featured Work",
    category: "Photography",
  },
  {
    slug: "street",
    title: "Street Life",
    category: "Street Photography",
  },
  {
    slug: "portrait",
    title: "Portraits",
    category: "Portraiture",
  },
];

const projects = [];

for (const collection of collections) {
  const directory = join(
    root,
    "public",
    "images",
    "stories",
    collection.slug
  );

  let names;

  try {
    names = await readdir(directory);
  } catch {
    throw new Error(
      `Missing image directory: ${directory}`
    );
  }

  const imageNames = names
    .filter((name) =>
      /\.(jpg|jpeg|png|webp|avif)$/i.test(name)
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );

  const images = [];

  for (const name of imageNames) {
    const file = join(directory, name);
    const info = await stat(file);

    if (!info.isFile()) continue;

    images.push(
      `/images/stories/${collection.slug}/` +
        encodeURIComponent(name)
    );
  }

  if (images.length === 0) {
    throw new Error(
      `No usable images found in ${directory}`
    );
  }

  projects.push({
    ...collection,
    cover: images[0],
    images,
  });

  console.log(
    `✓ ${collection.title}: ${images.length} images`
  );
}

const destination = join(
  root,
  "src",
  "data",
  "timeline-projects.ts"
);

await mkdir(join(root, "src", "data"), {
  recursive: true,
});

const content = `// AUTO-GENERATED TIMELINE TEST COLLECTION.
// Source: public/images/stories/{featured,street,portrait}
// Regenerate with: node scripts/sync-timeline-placeholders.mjs

import type { HorizontalProject } from "./horizontal-gallery.generated";

export const timelineProjects: HorizontalProject[] = ${JSON.stringify(projects, null, 2)};
`;

await writeFile(destination, content);

console.log(
  `✓ Timeline populated with ${
    projects.reduce(
      (total, project) => total + project.images.length,
      0
    )
  } existing photographs.`
);

console.log("✓ No source images were modified.");
