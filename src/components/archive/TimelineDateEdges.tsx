"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getPhotoMetadata } from "@/data/photo-metadata";

type Photograph = {
  src: string;
};

type Props = {
  photographs: Photograph[];
  activeIndex: number;
  visible: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

function compactDate(date: string): string {
  const match = date.trim().match(
    /^(\\d{1,2})\\s+[A-Za-z]{3,}\\s+(\\d{4})$/
  );

  if (!match) return date;

  return `${match[1].padStart(2, "0")}–${match[2].slice(-2)}`;
}

export default function TimelineDateEdges({
  photographs,
  activeIndex,
  visible,
  onPrevious,
  onNext,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (
    !mounted ||
    !visible ||
    photographs.length < 2
  ) {
    return null;
  }

  const count = photographs.length;

  const previous = getPhotoMetadata(
    photographs[wrap(activeIndex - 1, count)].src
  );

  const next = getPhotoMetadata(
    photographs[wrap(activeIndex + 1, count)].src
  );

  return createPortal(
    <nav
      className="p22-date-edges-v3"
      aria-label="Previous and next photograph dates"
    >
      <button
        type="button"
        className="p22-date-edge-v3 p22-date-edge-v3--previous"
        onClick={onPrevious}
        aria-label={`Previous photograph, ${previous.date}`}
      >
        <span className="p22-date-edge-v3-label">
          ← PREVIOUS
        </span>
        <strong>{compactDate(previous.date)}</strong>
      </button>

      <button
        type="button"
        className="p22-date-edge-v3 p22-date-edge-v3--next"
        onClick={onNext}
        aria-label={`Next photograph, ${next.date}`}
      >
        <span className="p22-date-edge-v3-label">
          NEXT →
        </span>
        <strong>{compactDate(next.date)}</strong>
      </button>
    </nav>,
    document.body
  );
}
