"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { getProjectStory } from "@/data/project-stories";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  title: string;
  category: string;
  images: readonly string[];
};

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}



export default function TimelineProjectViewer({
  title,
  category,
  images,
}: Props) {
  // POINT22 PROJECT STORY PANEL
  const pathname = usePathname();
  const projectSlug =
    pathname.split("/").filter(Boolean).pop() ?? "featured";
  const projectStory = getProjectStory(projectSlug);

  // POINT22 STORY REVEAL V4
  const storyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const story = storyRef.current;
    if (!story) return;

    story.classList.remove("is-visible");

    let disposed = false;
    let frame = 0;
    let timeout = 0;
    let observer: MutationObserver | null = null;

    const reveal = () => {
      if (disposed) return;

      story.classList.add("is-visible");
      observer?.disconnect();
    };

    // PRINT LAB lives outside the page and
    // remains mounted during route navigation.
    const portal = document.querySelector<HTMLElement>(
      ".p22-print-portal"
    );

    const check = () => {
      if (!portal || !portal.isConnected) {
        reveal();
        return;
      }

      const style = window.getComputedStyle(portal);

      if (
        style.visibility === "hidden" ||
        Number(style.opacity) < 0.01
      ) {
        reveal();
      }
    };

    if (portal) {
      observer = new MutationObserver(check);

      observer.observe(portal, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    }

    frame = window.requestAnimationFrame(check);

    // Fallback if navigation or the photographic
    // transition is interrupted.
    timeout = window.setTimeout(reveal, 6000);

    return () => {
      disposed = true;
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [projectSlug]);

  const [active, setActive] = useState(0);

  // POINT22 — SELECTED PHOTOGRAPH HANDOFF
  // The print chosen in Timeline becomes the
  // photograph initially shown in this viewer.
  useEffect(() => {
    let stored: string | null = null;

    try {
      stored = window.sessionStorage.getItem(
        "point22:timeline-project-selection"
      );

      window.sessionStorage.removeItem(
        "point22:timeline-project-selection"
      );
    } catch {
      return;
    }

    if (!stored) return;

    try {
      const selection = JSON.parse(stored) as {
        slug: string;
        source: string;
        at: number;
      };

      const currentSlug =
        window.location.pathname.split("/").pop();

      if (
        selection.slug !== currentSlug ||
        Date.now() - selection.at > 10000
      ) {
        return;
      }

      const target = decodeURIComponent(
        selection.source
      );

      const index = images.findIndex(
        (src) => decodeURIComponent(src) === target
      );

      if (index >= 0) {
        window.requestAnimationFrame(() => {
          setActive(index);
        });
      }
    } catch {
      // Malformed or expired selection:
      // keep the normal first photograph.
    }
  }, [images]);


  const [zoom, setZoom] = useState(false);
  const [gestures, setGestures] = useState(true);

  const photoAreaRef = useRef<HTMLDivElement>(null);
  const thumbListRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(
    null
  );

  const wheelState = useRef({
    lastEvent: 0,
    lastMove: 0,
    lastDirection: 0,
    lastMoveDirection: 0,
    accumulated: 0,
  });

  const navigate = useCallback(
    (direction: number) => {
      if (!images.length) return;

      setActive((current) =>
        wrap(current + direction, images.length)
      );
      setZoom(false);
    },
    [images.length, setZoom]
  );

  const select = (index: number) => {
    setActive(index);
    setZoom(false);
  };

  useEffect(() => {
    const list = thumbListRef.current;
    const thumb = thumbRefs.current[active];

    if (!list || !thumb) return;

    const listBox = list.getBoundingClientRect();
    const thumbBox = thumb.getBoundingClientRect();

    // Scroll only the thumbnail rail,
    // never the surrounding page.
    const target =
      list.scrollTop +
      (thumbBox.top - listBox.top) -
      (list.clientHeight - thumbBox.height) / 2;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    list.scrollTo({
      top: Math.max(0, target),
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }, [active]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target as HTMLElement | null)?.closest(
          "input, textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      if (
        event.key === "ArrowRight" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        navigate(1);
      }

      if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowUp"
      ) {
        event.preventDefault();
        navigate(-1);
      }

      if (event.key === "Escape") {
        setZoom(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    return () =>
      window.removeEventListener("keydown", handleKey);
  }, [navigate]);

  useEffect(() => {
    const area = photoAreaRef.current;
    if (!area || !gestures) return;

    // POINT22 RESPONSIVE DETAIL WHEEL
    // Respond immediately without locking
    // until the user stops scrolling.

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;

      const dominantDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;

      if (!dominantDelta) return;

      event.preventDefault();

      const scale =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? area.clientHeight
            : 1;

      const delta = dominantDelta * scale;
      const direction = Math.sign(delta);
      const now = performance.now();
      const state = wheelState.current;

      // A new gesture or reversed direction
      // immediately resets the accumulation.
      if (
        now - state.lastEvent > 180 ||
        direction !== state.lastDirection
      ) {
        state.accumulated = 0;
      }

      state.lastEvent = now;
      state.lastDirection = direction;
      state.accumulated += delta;

      // Small movements combine naturally.
      if (Math.abs(state.accumulated) < 24) {
        return;
      }

      // A short interval prevents rapid
      // momentum from skipping too many photos.
      // Reversing direction remains immediate.
      if (
        direction === state.lastMoveDirection &&
        now - state.lastMove < 300
      ) {
        return;
      }

      state.lastMove = now;
      state.lastMoveDirection = direction;
      state.accumulated = 0;

      navigate(direction);
    };

    area.addEventListener("wheel", onWheel, {
      passive: false,
    });

    return () => area.removeEventListener("wheel", onWheel);
  }, [gestures, navigate]);

  const activeImage = images[active];

  // A moving photographic scale underneath a fixed
  // red centre marker.
  const tickCount = Math.max(240, images.length * 30 + 120);
  const centreTick = Math.floor(tickCount / 2);
  const tickOffset = (centreTick + active * 12) * 18;

  return (
    <div className="p22-detail-viewer">
      <div className="p22-detail-project-name">
        <strong>{title}</strong>
        <span>{category}</span>
      </div>

      <div className="p22-detail-stage">
        <aside className="p22-detail-intro">

          <section
            ref={storyRef}
            key={projectSlug}
            className="p22-project-story p22-story-reveal"
            aria-label="Project story"
          >

            <h2
              className="p22-project-story-title p22-ink-title"
              aria-label={projectStory.title}
            >
              {projectStory.title
                .split(" ")
                .map((word, wordIndex) => (
                  <span
                    key={`${projectSlug}-ink-word-${wordIndex}`}
                    className="p22-ink-word"
                    aria-hidden="true"
                  >
                    {Array.from(word).map(
                      (letter, letterIndex) => (
                        <span
                          key={`${wordIndex}-${letterIndex}`}
                          className="p22-ink-character"
                          style={{
                            transitionDelay: `${
                              100 +
                              (wordIndex * 9 + letterIndex) * 42
                            }ms`,
                          }}
                        >
                          {letter}
                        </span>
                      )
                    )}
                  </span>
                ))}
            </h2>

            <div className="p22-project-story-copy">
              {projectStory.paragraphs.map(
                (paragraph, index) => (
                  <p
                    key={`${projectSlug}-paragraph-${index}`}
                    style={{
                      transitionDelay: `${840 + index * 190}ms`,
                    }}
                  >
                    {paragraph}
                  </p>
                )
              )}
            </div>

            <p
              className="p22-project-story-closing"
              style={{ transitionDelay: "1350ms" }}
            >
              {projectStory.closing}
            </p>
          </section>
        </aside>

        <div
          className={
            "p22-detail-photo-area" +
            (zoom ? " is-zoomed" : "")
          }
          ref={photoAreaRef}
          onTouchStart={(event) => {
            if (!gestures) return;

            const touch = event.touches[0];

            touchStart.current = {
              x: touch.clientX,
              y: touch.clientY,
            };
          }}
          onTouchEnd={(event) => {
            if (!gestures || !touchStart.current) return;

            const touch = event.changedTouches[0];
            const dx = touch.clientX - touchStart.current.x;
            const dy = touch.clientY - touchStart.current.y;

            touchStart.current = null;

            if (
              Math.abs(dx) > 55 &&
              Math.abs(dx) > Math.abs(dy) * 1.2
            ) {
              navigate(dx < 0 ? 1 : -1);
            }
          }}
        >
          <button
            className="p22-detail-main-photo"
            type="button"
            aria-label={
              zoom ? "Disable photograph zoom" : "Zoom photograph"
            }
            aria-pressed={zoom}
            onClick={() => setZoom((value) => !value)}
          >
            {activeImage && (
              <div
                key={activeImage}
                className="p22-detail-image-reveal"
              >
                <Image
                  src={activeImage}
                  alt={`${title} — photograph ${active + 1}`}
                  fill
                  sizes="(max-width: 760px) 80vw, 40vw"
                  priority={active === 0}
                  draggable={false}
                />
              </div>
            )}
          </button>
        </div>

        <div
          className="p22-detail-thumbnails"
          aria-label="Project photographs"
        >
          <button
            type="button"
            className="p22-detail-thumb-arrow"
            onClick={() => navigate(-1)}
            aria-label="Previous photograph"
          >
            ↑
          </button>

          <div className="p22-detail-thumb-list" ref={thumbListRef}>
            {images.map((src, index) => (
              <button
                key={`${src}-${index}`}
                ref={(node) => {
                  thumbRefs.current[index] = node;
                }}
                type="button"
                className={
                  "p22-detail-thumb" +
                  (index === active ? " is-active" : "")
                }
                onClick={() => select(index)}
                aria-label={`Show photograph ${index + 1}`}
                aria-pressed={index === active}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="90px"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className="p22-detail-thumb-arrow"
            onClick={() => navigate(1)}
            aria-label="Next photograph"
          >
            ↓
          </button>
        </div>

        <div className="p22-detail-progress">

          <div
            className="p22-detail-progress-line"
            aria-hidden="true"
          >
            <span
              style={{
                top: `${
                  images.length > 1
                    ? (active / (images.length - 1)) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      <footer className="p22-detail-footer">
        <div className="p22-detail-footer-controls">
          <button
            type="button"
            onClick={() => setZoom((value) => !value)}
            aria-pressed={zoom}
          >
            ZOOM: [ {zoom ? "ON" : "OFF"} ]
          </button>

          <button
            type="button"
            onClick={() => {
              setGestures((value) => !value);
              wheelState.current = {
                  lastEvent: 0,
                  lastMove: 0,
                  lastDirection: 0,
                  lastMoveDirection: 0,
                  accumulated: 0,
                };
            }}
            aria-pressed={gestures}
          >
            GESTURES: [ {gestures ? "ON" : "OFF"} ]
          </button>
        </div>

        <div className="p22-detail-ruler" aria-hidden="true">
          <div
            className="p22-detail-ruler-ticks"
            style={{
              transform: `translate3d(calc(50vw - ${tickOffset}px), 0, 0)`,
            }}
          >
            {Array.from({ length: tickCount }, (_, index) => (
              <span
                key={index}
                className={
                  index % 12 === 0
                    ? "is-major"
                    : index % 6 === 0
                      ? "is-medium"
                      : ""
                }
              />
            ))}
          </div>
          <span className="p22-detail-ruler-marker" />
        </div>
      </footer>
    </div>
  );
}
