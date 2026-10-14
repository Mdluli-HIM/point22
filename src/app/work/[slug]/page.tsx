import { Suspense } from "react";
import { notFound } from "next/navigation";
import StoryGallery from "@/components/stories/StoryGallery";
import { stories, getStory } from "@/data/stories";
import "@/styles/story.css";
import "@/styles/story-reel.css";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return stories.map((story) => ({
    slug: story.slug,
  }));
}

async function StoryContent({ params }: PageProps) {
  const { slug } = await params;
  const story = getStory(slug);

  if (!story) {
    notFound();
  }

  return <StoryGallery story={story} />;
}

export default function WorkPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            background: "#050505",
          }}
        />
      }
    >
      <StoryContent params={params} />
    </Suspense>
  );
}
