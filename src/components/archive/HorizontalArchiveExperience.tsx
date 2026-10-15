"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useRouter } from "next/navigation";
import GalleryCursor from "@/components/archive/GalleryCursor";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { timelineProjects as horizontalProjects } from "@/data/timeline-projects";
import { getPhotoMetadata } from "@/data/photo-metadata";
import { getPhotoTitle } from "@/data/photo-titles";
import EmblaTimeline from "@/components/archive/EmblaTimeline";
import TimelineDateEdges from "@/components/archive/TimelineDateEdges";

import "@/styles/horizontal-archive.css";

type Props = {
  children: ReactNode;
};

function wrap(index: number, length: number) {
  return ((index % length) + length) % length;
}

export default function HorizontalArchiveExperience({
  children,
}: Props) {
  const router = useRouter();

  const [inGallery, setInGallery] = useState(true);
  const [step, setStep] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: "x",
    loop: true,
    align: "center",
    dragFree: false,
    slidesToScroll: 1,
    skipSnaps: false,
    duration: 32,
  });
  const [fisheye, setFisheye] = useState(false);
  const homeRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const inGalleryRef = useRef(true);
  const homeGesture = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
  });

  const suppressClickRef = useRef(false);

  const photographs = useMemo(() => {
    const seen = new Set<string>();

    return horizontalProjects.flatMap((project) =>
      project.images.flatMap((src) => {
        if (seen.has(src)) return [];

        seen.add(src);

        return [{
          src,
          title: getPhotoTitle(src),
          category: project.category,
          slug: project.slug,
        }];
      })
    );
  }, []);

  const enterGallery = useCallback(() => {
    inGalleryRef.current = true;
    setInGallery(true);
  }, []);

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const move = useCallback((amount: number) => {
    if (!emblaApi || amount === 0) return;

    const direction = Math.sign(amount);

    for (let index = 0; index < Math.abs(amount); index++) {
      if (direction > 0) {
        emblaApi.scrollNext();
      } else {
        emblaApi.scrollPrev();
      }
    }
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const updateSelected = () => {
      setStep(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", updateSelected);
    emblaApi.on("reInit", updateSelected);

    const frame = requestAnimationFrame(updateSelected);

    return () => {
      cancelAnimationFrame(frame);
      emblaApi.off("select", updateSelected);
      emblaApi.off("reInit", updateSelected);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !inGallery) return;

    const frame = requestAnimationFrame(() => {
      emblaApi.reInit({
        loop: true,
        align: "center",
        dragFree: false,
        slidesToScroll: 1,
        skipSnaps: false,
        duration: 32,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [emblaApi, inGallery]);

  // POINT22 MARCUS WHEEL SCROLL
  // Applied only to the standalone Timeline.
  //
  // Wheel up/down and horizontal trackpad:
  // previous / next photograph.
  //
  // Direct dragging remains Embla-native.

  useEffect(() => {
    const stage = galleryRef.current;
    const api = emblaApi;

    if (!stage || !api) return;

    let accumulatedDelta = 0;
    let lastEventTime = 0;
    let lastMoveTime = 0;

    const SCROLL_THRESHOLD = 32;
    const SCROLL_COOLDOWN = 650;

    function handleWheel(event: WheelEvent) {
      if (event.ctrlKey) return;

      event.preventDefault();

      // Support vertical and horizontal input.
      const dominantDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY;

      if (!dominantDelta) return;

      const multiplier =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? stage!.clientHeight
            : 1;

      const delta = dominantDelta * multiplier;
      const now = performance.now();

      // Reset after a pause between gestures.
      if (now - lastEventTime > 220) {
        accumulatedDelta = 0;
      }

      lastEventTime = now;

      // Prevent momentum from causing
      // repeated unwanted navigation.
      if (now - lastMoveTime < SCROLL_COOLDOWN) {
        return;
      }

      accumulatedDelta += delta;

      if (
        Math.abs(accumulatedDelta) <
        SCROLL_THRESHOLD
      ) {
        return;
      }

      const direction =
        accumulatedDelta > 0 ? 1 : -1;

      accumulatedDelta = 0;
      lastMoveTime = now;

      if (direction > 0) {
        api?.scrollNext();
      } else {
        api?.scrollPrev();
      }
    }

    stage.addEventListener(
      "wheel",
      handleWheel,
      { passive: false }
    );

    return () => {
      stage.removeEventListener(
        "wheel",
        handleWheel
      );
    };
  }, [emblaApi]);

  // POINT22 V10 — RESTORE SELECTED PHOTOGRAPH
  //
  // When returning from /timeline/[slug],
  // select the same photograph immediately.
  //
  // The wheel and dragging handlers are
  // intentionally left unchanged.

  useEffect(() => {
    if (!emblaApi || photographs.length === 0) {
      return;
    }

    const STORAGE = "point22:timeline-return-photo";

    let stored: string | null = null;

    try {
      stored = window.sessionStorage.getItem(STORAGE);
    } catch {
      return;
    }

    if (!stored) return;

    let selection: {
      slug: string;
      source: string;
      at: number;
    };

    try {
      selection = JSON.parse(stored);
    } catch {
      window.sessionStorage.removeItem(STORAGE);
      return;
    }

    if (
      typeof selection.source !== "string" ||
      typeof selection.at !== "number" ||
      Date.now() - selection.at > 15000
    ) {
      window.sessionStorage.removeItem(STORAGE);
      return;
    }

    const normalize = (src: string) => {
      try {
        const url = new URL(src, window.location.origin);

        const path =
          url.pathname === "/_next/image"
            ? url.searchParams.get("url") ?? ""
            : url.pathname;

        return decodeURIComponent(path);
      } catch {
        return src;
      }
    };

    const wanted = normalize(selection.source);

    const index = photographs.findIndex(
      (photo) =>
        photo.slug === selection.slug &&
        normalize(photo.src) === wanted
    );

    if (index < 0) {
      window.sessionStorage.removeItem(STORAGE);
      return;
    }

    // Let Embla finish initializing/reinitializing
    // before restoring the correct position.
    const frame = requestAnimationFrame(() => {
      emblaApi.scrollTo(index, true);
      setStep(index);

      window.sessionStorage.removeItem(STORAGE);
    });

    return () => cancelAnimationFrame(frame);
  }, [emblaApi, photographs]);

  const timelinePhotographs = useMemo(
    () =>
      photographs.map((photo) => ({
        src: photo.src,
        ...getPhotoMetadata(photo.src),
      })),
    [photographs]
  );

  const current = photographs.length
    ? photographs[wrap(step, photographs.length)]
    : null;

  const currentMeta = current
    ? getPhotoMetadata(current.src)
    : null;



  useEffect(() => {
    const home = homeRef.current;
    const gallery = galleryRef.current;

    if (!home || !gallery) return;

    let homeAccumulator = 0;
    function onHomeWheel(event: WheelEvent) {
      if (event.ctrlKey || inGalleryRef.current) return;

      // The homepage only changes scenes via
      // horizontal movement, not vertical scrolling.
      const delta = event.deltaX ||
        (event.shiftKey ? event.deltaY : 0);

      if (delta <= 0) {
        homeAccumulator = 0;
        return;
      }

      homeAccumulator += delta;

      if (homeAccumulator > 65) {
        homeAccumulator = 0;
        event.preventDefault();
        enterGallery();
      }
    }

    // One Embla movement per uninterrupted
    // wheel / trackpad gesture.

    // One Embla movement per uninterrupted
    // wheel / trackpad gesture.

    // One Embla movement per uninterrupted
    // wheel / trackpad gesture.

    // One Embla movement per uninterrupted
    // wheel / trackpad gesture.

    // One Embla movement per uninterrupted
    // wheel / trackpad gesture.

    // Timeline: one movement per wheel gesture.
    // Embla handles drag, snapping and looping.

    home.addEventListener("wheel", onHomeWheel, {
      passive: false,
    });


    function onKeyDown(event: KeyboardEvent) {
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

      if (!inGalleryRef.current) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          enterGallery();
        }

        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      home.removeEventListener("wheel", onHomeWheel);


      window.removeEventListener(
        "keydown",
        onKeyDown
      );
    };
  }, [emblaApi, enterGallery, move]);

  function onHomePointerDown(
    event: ReactPointerEvent<HTMLElement>
  ) {
    if (inGalleryRef.current) return;

    homeGesture.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function onHomePointerUp(
    event: ReactPointerEvent<HTMLElement>
  ) {
    const gesture = homeGesture.current;

    if (
      !gesture.active ||
      gesture.pointerId !== event.pointerId
    ) {
      return;
    }

    gesture.active = false;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (
      dx < -75 &&
      Math.abs(dx) > Math.abs(dy) * 1.25
    ) {
      suppressClickRef.current = true;
      enterGallery();

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 200);
    }
  }

  return (
    <div className="p22-horizontal-experience p22-timeline-route">
      <div
        className={
          "p22-horizontal-rail" +
          (inGallery ? " is-gallery" : "")
        }
      >
        <section
          ref={homeRef}
          className="p22-horizontal-panel p22-horizontal-home"
          aria-label="Point22 homepage"
          onPointerDown={onHomePointerDown}
          onPointerUp={onHomePointerUp}
          onPointerCancel={() => {
            homeGesture.current.active = false;
          }}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) return;

            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {children}
        </section>

        <section
          ref={galleryRef}
          className="p22-horizontal-panel p22-showcase"
          aria-label="Point22 continuous photo gallery"
          aria-hidden={!inGallery}
        >
          <div
            ref={emblaRef}
            className={
              "p22-carousel-stage" +
              (fisheye ? " is-fisheye" : "")
            }
            onClick={(event) => {
              if (!emblaApi || event.defaultPrevented) return;

              const element = event.target as HTMLElement;
              const photo = element.closest<HTMLElement>(
                ".p22-carousel-photo"
              );

              if (!photo) return;

              const index = Number(photo.dataset.photoIndex);

              if (!Number.isInteger(index)) return;

              if (index === step) {
                window.dispatchEvent(
                  new CustomEvent("point22:timeline-project-open", {
                    detail: { slug: photographs[index].slug },
                  })
                );
              } else {
                emblaApi.scrollTo(index);
              }
            }}
          >
            <div className="p22-embla-track">
              {photographs.map((photo, index) => {
                const isActive = index === step;

                return (
                  <div
                    key={photo.src}
                    data-photo-index={index}
                    className={
                      "p22-carousel-photo" +
                      (isActive ? " is-active" : "")
                    }
                    role="button"
                    tabIndex={inGallery ? 0 : -1}
                    aria-label={
                      isActive
                        ? `Open ${photo.title}`
                        : `Select ${photo.title}`
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key !== "Enter" &&
                        event.key !== " "
                      ) {
                        return;
                      }

                      event.preventDefault();
                      event.stopPropagation();

                      if (isActive) {
                        window.dispatchEvent(
                          new CustomEvent("point22:timeline-project-open", {
                            detail: { slug: photo.slug },
                          })
                        );
                      } else {
                        emblaApi?.scrollTo(index);
                      }
                    }}
                  >
                    <Image
                      src={photo.src}
                      alt={`${photo.title} photography`}
                      fill
                      sizes="(max-width: 720px) 70vw, 29vw"
                      draggable={false}
                      priority={index === 0}
                    />
                  </div>
                );
              })}
            </div>

            <GalleryCursor />
          </div>

          {current && (
            <div className="p22-showcase-hud">
              <div className="p22-showcase-hud-left">

                <button
                  className="p22-showcase-brand"
                  type="button"
                  onClick={goHome}
                >
                  POINT22®
                </button>

                <button
                  type="button"
                  className="p22-showcase-fisheye"
                  aria-pressed={fisheye}
                  onClick={() => setFisheye(!fisheye)}
                >
                  FISHEYE: [{fisheye ? "ON" : "OFF"}]
                </button>
              </div>

              <div className="p22-showcase-hud-middle">
                <span
                  className="p22-showcase-indicator"
                  aria-hidden="true"
                />
                <strong>{current.title}</strong>
                <span>22</span>
              </div>

              <div className="p22-showcase-hud-right">

                <Link
                  className="p22-showcase-preview"
                  href={`/timeline/${current.slug}`}
                  tabIndex={inGallery ? 0 : -1}
                  aria-label={`View ${current.title}`}
                >
                  <Image
                    src={current.src}
                    alt=""
                    fill
                    sizes="110px"
                  />
                </Link>
              </div>

              {currentMeta && (
                <EmblaTimeline
                  api={emblaApi}
                  photographs={timelinePhotographs}
                />
              )}
              {/* POINT22 DATE EDGES V3
                  Independent of HUD positioning. */}
              <TimelineDateEdges
                photographs={photographs}
                activeIndex={step}
                visible={inGallery}
                onPrevious={() => move(-1)}
                onNext={() => move(1)}
              />

            </div>
          )}
        </section>
      </div>
    </div>
  );
}
