import { Suspense } from "react";
import { notFound } from "next/navigation";

import Point22Header from
  "@/components/archive/Point22Header";

import TimelineProjectViewer from
  "@/components/timeline/TimelineProjectViewer";

import { timelineProjects } from
  "@/data/timeline-projects";

import "@/styles/timeline-project.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return timelineProjects.map((project) => ({
    slug: project.slug,
  }));
}

// Only this part reads the URL-specific
// project slug.
async function ProjectContent({ params }: Props) {
  const { slug } = await params;

  const project = timelineProjects.find(
    (item) => item.slug === slug
  );

  if (!project || project.images.length === 0) {
    notFound();
  }

  return (
    <TimelineProjectViewer
      title={project.title}
      category={project.category}
      images={project.images}
    />
  );
}

// Keep the shared navigation outside
// Suspense so it can render immediately.
export default function TimelineProjectPage({
  params,
}: Props) {
  return (
    <main className="p22-detail-page">
      <Point22Header />

      <Suspense
        fallback={
          <div
            className="p22-detail-viewer"
            aria-hidden="true"
          />
        }
      >
        <ProjectContent params={params} />
      </Suspense>
    </main>
  );
}
