"use client";

import { useEffect, useRef, useState } from "react";
import type { EmblaCarouselType } from "embla-carousel";
import ShowcaseTimestamp from "@/components/archive/ShowcaseTimestamp";

type Photograph = {
  src: string;
  date: string;
  time: string;
  location: string;
};

type Props = {
  api: EmblaCarouselType | undefined;
  photographs: Photograph[];
};

export default function EmblaTimeline({
  api,
  photographs,
}: Props) {
  const [position, setPosition] = useState(0);
  const lastPosition = useRef(0);

  useEffect(() => {
    if (!api || !photographs.length) return;

    let frame = 0;

    const measure = () => {
      frame = 0;

      const index = api.selectedScrollSnap();
      const viewport = api.rootNode();
      const slide = api.slideNodes()[index];

      if (!slide) return;

      const viewportRect = viewport.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();

      if (slideRect.width <= 0) return;

      const viewportCentre =
        viewportRect.left + viewportRect.width / 2;

      const slideCentre =
        slideRect.left + slideRect.width / 2;

      // Includes the fractional position while
      // dragging and during Embla's settle animation.
      const raw =
        index +
        (viewportCentre - slideCentre) /
          slideRect.width;

      // Keep the analog ruler continuous even
      // when Embla wraps from last to first.
      const count = photographs.length;

      const cycle = Math.round(
        (lastPosition.current - raw) / count
      );

      const continuous = raw + cycle * count;

      if (
        Math.abs(continuous - lastPosition.current) >
        0.0001
      ) {
        lastPosition.current = continuous;
        setPosition(continuous);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    api.on("scroll", schedule);
    api.on("select", schedule);
    api.on("reInit", schedule);

    schedule();

    return () => {
      cancelAnimationFrame(frame);
      api.off("scroll", schedule);
      api.off("select", schedule);
      api.off("reInit", schedule);
    };
  }, [api, photographs.length]);

  return (
    <ShowcaseTimestamp
      position={position}
      photographs={photographs}
    />
  );
}
