import {
  storyMedia,
  type StoryAsset,
} from "@/data/story-media.generated";

export type Story = {
  slug: string;
  title: string;
  category: string;
  cover: string;
  media: StoryAsset[];
};

// Titles can be updated when the final stories are supplied.
// Each story uses its real homepage image as its cover.
const entries = [
  {
    slug: "featured",
    title: "Through My Eyes",
    category: "Visual Journal",
    cover: "/images/archive/01-featured.jpg",
  },
  {
    slug: "portrait",
    title: "People & Culture",
    category: "Photography",
    cover: "/images/archive/02-portrait.jpg",
  },
  {
    slug: "detail",
    title: "Moments in Between",
    category: "Photography",
    cover: "/images/archive/03-detail.jpg",
  },
  {
    slug: "street",
    title: "Out in the World",
    category: "Street Culture",
    cover: "/images/archive/04-street.jpg",
  },
  {
    slug: "motion",
    title: "Life in Motion",
    category: "Visual Journal",
    cover: "/images/archive/05-motion.jpg",
  },
] as const;

export const stories: Story[] = entries.map((entry) => ({
  ...entry,
  media: [
    {
      src: entry.cover,
      type: "image" as const,
    },
    ...(storyMedia[entry.slug] ?? []),
  ],
}));

export function getStory(slug: string) {
  return stories.find((story) => story.slug === slug);
}
