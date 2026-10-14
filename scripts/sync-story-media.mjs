import fs from "node:fs";
import path from "node:path";

const slugs = [
  "featured",
  "portrait",
  "detail",
  "street",
  "motion",
];

const imageExtensions = /\.(jpg|jpeg|png|webp|avif)$/i;
const videoExtensions = /\.(mp4|webm)$/i;

const manifest = {};

for (const slug of slugs) {
  const assets = [];

  for (const type of ["images", "videos"]) {
    const directory = path.join(
      process.cwd(),
      "public",
      type,
      "stories",
      slug
    );

    fs.mkdirSync(directory, { recursive: true });

    const files = fs.readdirSync(directory)
      .filter((file) =>
        type === "images"
          ? imageExtensions.test(file)
          : videoExtensions.test(file)
      )
      .sort((a, b) =>
        a.localeCompare(b, undefined, {
          numeric: true,
        })
      );

    for (const file of files) {
      assets.push({
        src: `/${type}/stories/${slug}/${encodeURIComponent(file)}`,
        type: type === "images" ? "image" : "video",
      });
    }
  }

  manifest[slug] = assets;
}

const output = `// Auto-generated. Do not edit manually.
export type StoryAsset = {
  src: string;
  type: "image" | "video";
};

export const storyMedia: Record<string, StoryAsset[]> =
${JSON.stringify(manifest, null, 2)};
`;

fs.writeFileSync(
  path.join(
    process.cwd(),
    "src",
    "data",
    "story-media.generated.ts"
  ),
  output
);

console.log("Point22 story galleries synchronized.");

for (const slug of slugs) {
  console.log(`${slug}: ${manifest[slug].length} extra media`);
}
