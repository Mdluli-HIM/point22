"use client";

import Image from "next/image";
import { flushSync } from "react-dom";
import StoryReel from "@/components/stories/StoryReel";
import InfiniteStoryFlow from "@/components/stories/InfiniteStoryFlow";
import InfiniteStoryGrid from "@/components/stories/InfiniteStoryGrid";
import Link from "next/link";
import gsap from "gsap";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { Story } from "@/data/stories";

type ViewMode = "flow" | "grid";

type StoryGalleryProps = {
  story: Story;
};

export default function StoryGallery({
  story,
}: StoryGalleryProps) {
  const [mode, setMode] = useState<ViewMode>("flow");
  const [flowStyle, setFlowStyle] = useState<"float" | "reel">("float");
  const [selected, setSelected] = useState<number | null>(null);

  const photoOriginRef = useRef<{
    index: number;
    image: HTMLImageElement;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const viewerTouch = useRef<number | null>(null);

  const media = story.media;

  // Animate cards whenever the viewing mode changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        ".p22-story-media-card",
        {
          opacity: 0,
          y: 28,
          scale: 0.94,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.85,
          stagger: {
            each: 0.045,
            from: "start",
          },
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }, root);

    return () => context.revert();
  }, [mode, story.slug]);

  function openImage(index: number, source?: HTMLElement) {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    photoOriginRef.current = null;

    const image = source?.querySelector<HTMLImageElement>("img");

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const browser = document as Document & {
      startViewTransition?: (
        update: () => void
      ) => { finished: Promise<void> };
    };

    // Reel already performs its own WebGL transition.
    // Only Float/Grid provide a source image element.
    if (
      !image ||
      !image.isConnected ||
      media[index]?.type !== "image" ||
      reducedMotion ||
      !browser.startViewTransition
    ) {
      setSelected(index);
      return;
    }

    photoOriginRef.current = {
      index,
      image,
    };

    // Capture the actual image, not its surrounding card.
    image.style.viewTransitionName =
      "p22-gallery-image";

    const transitionPage =
      document.querySelector<HTMLElement>(
        ".p22-story-page"
      );

    transitionPage?.setAttribute(
      "data-p22-photo-transition",
      "opening"
    );

    const transition = browser.startViewTransition(() => {
      image.style.viewTransitionName = "";

      flushSync(() => {
        setSelected(index);
      });
    });

    void transition.finished.then(
      () => transitionPage?.removeAttribute("data-p22-photo-transition"),
      () => transitionPage?.removeAttribute("data-p22-photo-transition")
    );

    void transition.finished.then(
      () => {
        image.style.viewTransitionName = "";
      },
      () => {
        image.style.viewTransitionName = "";
      }
    );
  }

  function changeImage(direction: number) {
    if (media.length < 2 || selected === null) return;

    // Prevent overlapping transitions when users
    // press the arrows several times very quickly.
    const html = document.documentElement;

    if (html.hasAttribute("data-p22-viewer-nav")) {
      return;
    }

    const step = direction >= 0 ? 1 : -1;

    const nextIndex =
      ((selected + step) % media.length + media.length) %
      media.length;

    // After browsing to another image, returning
    // to the original clicked tile is no longer
    // a valid shared-image transition.
    photoOriginRef.current = null;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const browser = document as Document & {
      startViewTransition?: (
        update: () => void
      ) => { finished: Promise<void> };
    };

    // The regular viewer still works in browsers
    // without the View Transitions API.
    if (
      reducedMotion ||
      !browser.startViewTransition
    ) {
      setSelected(nextIndex);
      return;
    }

    html.setAttribute(
      "data-p22-viewer-nav",
      step > 0 ? "next" : "previous"
    );

    const release = () => {
      html.removeAttribute("data-p22-viewer-nav");
    };

    try {
      const transition = browser.startViewTransition(
        () => {
          flushSync(() => {
            setSelected(nextIndex);
          });
        }
      );

      void transition.finished.then(release, release);
    } catch {
      release();
      setSelected(nextIndex);
    }
  }

  function closeImage() {
    const origin = photoOriginRef.current;

    const browser = document as Document & {
      startViewTransition?: (
        update: () => void
      ) => { finished: Promise<void> };
    };

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const restoreFocus = () => {
      requestAnimationFrame(() => {
        previousFocus.current?.focus({
          preventScroll: true,
        });
      });
    };

    // Reverse the shared transition if the original
    // photograph is still mounted in Float or Grid.
    if (
      origin?.image.isConnected &&
      !reducedMotion &&
      browser.startViewTransition
    ) {
      const transitionPage =
        document.querySelector<HTMLElement>(
          ".p22-story-page"
        );

      transitionPage?.setAttribute(
        "data-p22-photo-transition",
        "closing"
      );

      const transition = browser.startViewTransition(() => {
        origin.image.style.viewTransitionName =
          "p22-gallery-image";

        flushSync(() => {
          setSelected(null);
        });
      });

      void transition.finished.then(
        () => transitionPage?.removeAttribute("data-p22-photo-transition"),
        () => transitionPage?.removeAttribute("data-p22-photo-transition")
      );

      void transition.finished.then(
        () => {
          origin.image.style.viewTransitionName = "";
          photoOriginRef.current = null;
          restoreFocus();
        },
        () => {
          origin.image.style.viewTransitionName = "";
          photoOriginRef.current = null;
          restoreFocus();
        }
      );

      return;
    }

    // Keep Reel's original closing behaviour intact.
    setSelected(null);
    photoOriginRef.current = null;
    restoreFocus();
  }

  // Viewer: Esc to close and arrows to browse.
  useEffect(() => {
    if (selected === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus({
      preventScroll: true,
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeImage();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        changeImage(1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeImage(-1);
      }

      // Keep keyboard focus inside the open viewer.
      if (event.key === "Tab" && viewerRef.current) {
        const elements =
          viewerRef.current.querySelectorAll<HTMLElement>(
            "button:not([disabled]), video[controls]"
          );

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (!first || !last) return;

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  // The selected index only controls whether the viewer is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected !== null]);

  return (
    <div
      ref={rootRef}
      className={`p22-story-page ${
        mode === "grid" ? "p22-story-page--grid" : ""
      }`}
    >
      <header className="p22-story-header">
        <Link
          href="/"
          className="p22-story-back"
          aria-label="Back to the Point22 homepage"
        >
          <span aria-hidden="true">←</span>
          POINT22®
        </Link>

        <div className="p22-story-heading">
          <strong>{story.title}</strong>
          <span>{story.category}</span>
        </div>

        <nav
          className="p22-story-switch"
          aria-label="Gallery view"
        >
          <button
            type="button"
            className={mode === "flow" ? "is-active" : ""}
            aria-pressed={mode === "flow"}
            onClick={() => setMode("flow")}
          >
            Flow
          </button>

          <button
            type="button"
            className={mode === "grid" ? "is-active" : ""}
            aria-pressed={mode === "grid"}
            onClick={() => setMode("grid")}
          >
            Grid
          </button>
        </nav>
      </header>

      {mode === "flow" ? (
        flowStyle === "reel" ? (
          <StoryReel
            media={media}
            storyTitle={story.title}
            onOpen={openImage}
          />
        ) : (
          <InfiniteStoryFlow
            media={media}
            storyTitle={story.title}
            onOpen={openImage}
          />
        )
      ) : (
        <InfiniteStoryGrid
          storyTitle={story.title}
          media={media}
          onOpen={openImage}
        />
      )}

      <footer className="p22-story-footer">
        <span>
          {mode === "flow"
            ? flowStyle === "reel"
              ? "SCROLL OR DRAG TO MOVE THE REEL"
              : "DRAG OR SCROLL TO EXPLORE"
            : "SELECT A FRAME TO EXPLORE"}
        </span>

        {mode === "flow" ? (
          <div
            className="p22-flow-style-switch"
            role="group"
            aria-label="Flow presentation"
          >
            <button
              type="button"
              className={
                flowStyle === "float" ? "is-active" : ""
              }
              aria-pressed={flowStyle === "float"}
              onClick={() => setFlowStyle("float")}
            >
              Float
            </button>

            <button
              type="button"
              className={
                flowStyle === "reel" ? "is-active" : ""
              }
              aria-pressed={flowStyle === "reel"}
              onClick={() => setFlowStyle("reel")}
            >
              Reel
            </button>
          </div>
        ) : (
          <Link href="/">BACK TO THE VIEW</Link>
        )}
      </footer>

      {selected !== null && (
        <div
          ref={viewerRef}
          className="p22-story-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${story.title} photograph viewer`}
          onTouchStart={(event) => {
            viewerTouch.current =
              event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            if (viewerTouch.current === null) return;

            const distance =
              event.changedTouches[0].clientX -
              viewerTouch.current;

            viewerTouch.current = null;

            if (Math.abs(distance) > 55) {
              changeImage(distance < 0 ? 1 : -1);
            }
          }}
        >
          <div className="p22-lightbox-header">
            <span>POINT22® / {story.title}</span>

            <button
              ref={closeRef}
              type="button"
              onClick={closeImage}
              aria-label="Close photograph"
            >
              CLOSE ×
            </button>
          </div>

          <div className="p22-lightbox-stage">
            {media[selected].type === "image" ? (
              <Image
                key={media[selected].src}
                src={media[selected].src}
                alt={`${story.title} — full photograph`}
                fill
                sizes="100vw"
                className="p22-lightbox-image"
                style={{
                  viewTransitionName: "p22-gallery-image",
                }}
                priority
              />
            ) : (
              <video
                key={media[selected].src}
                src={media[selected].src}
                controls
                playsInline
                autoPlay
                muted
                className="p22-lightbox-video"
              />
            )}
          </div>

          {media.length > 1 && (
            <nav
              className="p22-lightbox-navigation"
              aria-label="Browse photographs"
            >
              <button
                type="button"
                onClick={() => changeImage(-1)}
              >
                PREVIOUS
              </button>

              <button
                type="button"
                onClick={() => changeImage(1)}
              >
                NEXT
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
