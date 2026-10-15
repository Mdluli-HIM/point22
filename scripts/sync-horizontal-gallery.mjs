import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const projects = [
  {
    slug: "featured",
    title: "Featured Work",
    category: "Photography",
    cover: "/images/archive/01-featured.jpg",
  },
  {
    slug: "portrait",
    title: "Portraits",
    category: "Portraiture",
    cover: "/images/archive/02-portrait.jpg",
  },
  {
    slug: "detail",
    title: "The Details",
    category: "Visual Studies",
    cover: "/images/archive/03-detail.jpg",
  },
  {
    slug: "street",
    title: "Street Life",
    category: "Street Photography",
    cover: "/images/archive/04-street.jpg",
  },
  {
    slug: "motion",
    title: "In Motion",
    category: "Moving Images",
    cover: "/images/archive/05-motion.jpg",
  },
];

const imagePattern = /\.(png|jpe?g|webp|avif)$/i;

const output = projects.map((project) => {
  const folder = path.join(
    root,
    "public",
    "images",
    "stories",
    project.slug
  );

  const images = fs.existsSync(folder)
    ? fs.readdirSync(folder)
        .filter((filename) => imagePattern.test(filename))
        .sort((a, b) =>
          a.localeCompare(b, undefined, {
            numeric: true,
          })
        )
        .map(
          (filename) =>
            `/images/stories/${project.slug}/${encodeURIComponent(filename)}`
        )
    : [];

  return {
    ...project,
    images: [...new Set([project.cover, ...images])],
  };
});

const destination = path.join(
  root,
  "src",
  "data",
  "horizontal-gallery.generated.ts"
);

fs.mkdirSync(path.dirname(destination), {
  recursive: true,
});

fs.writeFileSync(
  destination,
  `// Generated from Point22's real media assets.
export type HorizontalProject = {
  slug: string;
  title: string;
  category: string;
  cover: string;
  images: string[];
};

export const horizontalProjects: HorizontalProject[] = ${JSON.stringify(output, null, 2)};
`
);

console.log(
  "Horizontal gallery synchronized:",
  output.reduce(
    (total, project) => total + project.images.length,
    0
  ),
  "photographs"
);
