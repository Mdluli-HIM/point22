"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import "@/styles/showcase-timestamp.css";

type Photograph = {
  src: string;
  date: string;
  time: string;
  location: string;
};

type Props = {
  position: number;
  photographs: Photograph[];
};

const SUBDIVISIONS = 24;

function wrap(value: number, length: number) {
  return ((value % length) + length) % length;
}

export default function ShowcaseTimestamp({
  position,
  photographs,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(420);

  useEffect(() => {
    const root = rootRef.current;

    const stage = root
      ?.closest(".p22-showcase")
      ?.querySelector<HTMLElement>(
        ".p22-carousel-stage"
      );

    if (!stage) return;

    const measure = () => {
      const card =
        stage.querySelector<HTMLElement>(
          ".p22-carousel-photo"
        );

      const width =
        card?.getBoundingClientRect().width;

      if (!width || width <= 0) return;

      setCardWidth((previous) =>
        Math.abs(previous - width) < 0.5
          ? previous
          : width
      );
    };

    const observer = new ResizeObserver(measure);

    observer.observe(stage);

    const frame = requestAnimationFrame(measure);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!photographs.length) return null;

  const base = Math.floor(position);
  const fraction = position - base;

  const activeIndex = Math.round(position);

  const active = photographs[
    wrap(activeIndex, photographs.length)
  ];

  // Move the entire ruler with the exact same
  // fractional scroll position as the images.
  const transportX = -fraction * cardWidth;

  // Render enough ruler either side of the
  // fixed centre playhead to fill the viewport.
  const segments = Array.from(
    { length: 15 },
    (_, i) => {
      const offset = i - 7;

      return {
        offset,
        index: base + offset,
      };
    }
  );

  const segmentStyle = {
    width: `${cardWidth}px`,
    "--p22-tick-step": `${
      cardWidth / SUBDIVISIONS
    }px`,
    "--p22-quarter-step": `${
      cardWidth / 4
    }px`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="p22-analog-timeline"
      role="group"
      aria-label="Photograph capture timeline"
    >
      <div
        className="p22-analog-scale"
        aria-hidden="true"
      >
        <div className="p22-analog-baseline" />

        {/* One continuously moving physical ruler. */}
        <div
          className="p22-analog-film"
          style={{
            transform: `translate3d(${transportX}px, 0, 0)`,
          }}
        >
          {segments.map(({ offset, index }) => (
            <div
              key={index}
              className="p22-analog-segment"
              style={{
                ...segmentStyle,
                left: `${offset * cardWidth}px`,
              }}
            >
              {/* The only photograph stop in
                  each segment is this long mark. */}
              <span className="p22-analog-long-tick" />
            </div>
          ))}
        </div>

        {/* Stationary playhead in viewport centre. */}
        <span className="p22-analog-playhead">
          <span className="p22-analog-playhead-tip" />
        </span>
      </div>

      {/* Only current photograph metadata. */}
      <div
        className="p22-analog-current"
        key={activeIndex}
      >
        <span className="p22-analog-date">
          {active.date}
        </span>

        <span className="p22-analog-divider">
          /
        </span>

        <span className="p22-analog-time">
          {active.time}
        </span>

        <span className="p22-analog-divider">
          /
        </span>

        <span className="p22-analog-location">
          {active.location}
        </span>
      </div>
    </div>
  );
}
