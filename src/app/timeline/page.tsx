import Point22Header from "@/components/archive/Point22Header";

import HorizontalArchiveExperience from
  "@/components/archive/HorizontalArchiveExperience";

import TimelineScrollGuard from
  "@/components/archive/TimelineScrollGuard";

export default function TimelinePage() {
  return (
    <>
      <TimelineScrollGuard />

      <Point22Header />

      <HorizontalArchiveExperience>
        {null}
      </HorizontalArchiveExperience>
    </>
  );
}
