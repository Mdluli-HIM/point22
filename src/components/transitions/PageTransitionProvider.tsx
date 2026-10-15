"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import ProjectToTimelineTransition from
  "./ProjectToTimelineTransition";
import TimelineToProjectTransition from "./TimelineToProjectTransition";

type TransitionContextValue = {
  navigateToTimeline: () => void;
};

const TransitionContext =
  createContext<TransitionContextValue | null>(null);

const STRIP_COUNT = 5;

export function usePageTransition() {
  const context = useContext(TransitionContext);

  if (!context) {
    throw new Error(
      "usePageTransition requires PageTransitionProvider"
    );
  }

  return context;
}

/*
 * Find the actual photograph occupying the
 * centre of the mounted Timeline.
 *
 * This is more accurate than assuming the
 * first photograph in the data array is active.
 */
function findTimelinePhoto(): HTMLImageElement | null {
  const centreX = window.innerWidth / 2;
  const centreY = window.innerHeight / 2;

  const candidates = Array.from(
    document.querySelectorAll<HTMLImageElement>("img")
  )
    .filter((img) => {
      const src = decodeURIComponent(
        img.currentSrc || img.src || ""
      );

      if (!src.includes("/images/stories/")) {
        return false;
      }

      const rect = img.getBoundingClientRect();

      return (
        rect.width > 100 &&
        rect.height > 100 &&
        rect.right > 0 &&
        rect.left < window.innerWidth &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight
      );
    })
    .map((img) => {
      const rect = img.getBoundingClientRect();

      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const distance =
        Math.abs(x - centreX) / window.innerWidth +
        Math.abs(y - centreY) / window.innerHeight;

      return { img, distance };
    })
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.img ?? null;
}

/*
 * Wait briefly for the incoming photograph.
 * Never hold the transition indefinitely.
 */
async function waitForTimelinePhoto() {
  const deadline = performance.now() + 1800;

  while (performance.now() < deadline) {
    const photo = findTimelinePhoto();

    if (
      photo &&
      photo.complete &&
      photo.naturalWidth > 0
    ) {
      return photo;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 65);
    });
  }

  return null;
}

function RouteObserver({
  onChange,
}: {
  onChange: (pathname: string) => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    onChange(pathname ?? "");
  }, [pathname, onChange]);

  return null;
}

export function PageTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const arrivalRef = useRef<HTMLDivElement>(null);

  // POINT22 INTERACTIVE EXPOSURE V5
  const exposureRef = useRef<HTMLDivElement>(null);
  const exposureHaloRef = useRef<HTMLDivElement>(null);
  const exposureSparkRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);

  const animationRef =
    useRef<ReturnType<typeof gsap.timeline> | null>(null);

  const timeoutRef = useRef<number | null>(null);

  const runningRef = useRef(false);
  const waitingRef = useRef(false);

  const lastPointerRef = useRef({
    x: 0,
    y: 0,
    seen: false,
  });
  const outgoingGridRef = useRef<HTMLElement | null>(null);

  const clearSafety = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearSafety();

    const root = rootRef.current;
    const arrival = arrivalRef.current;

    if (root) {
      gsap.set(root, {
        autoAlpha: 0,
        pointerEvents: "none",
        clearProps: "transform",
      });
    }

    if (arrival) {
      arrival.replaceChildren();
    }

    if (exposureRef.current) {
      gsap.set(exposureRef.current, {
        autoAlpha: 0,
      });
    }

    const grid = outgoingGridRef.current;

    if (grid?.isConnected) {
      gsap.set(grid, {
        clearProps: "transform,filter",
      });
    }

    runningRef.current = false;
    waitingRef.current = false;
    outgoingGridRef.current = null;
  }, [clearSafety]);

  /*
   * ARRIVAL:
   *
   * Locate the real selected Timeline image,
   * duplicate its pixels, then register that
   * duplicate into the image's actual rectangle.
   */
  const revealTimeline = useCallback(async () => {
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const bridge = arrivalRef.current;
    const exposure = exposureRef.current;

    const title = titleRef.current;
    const caption = captionRef.current;

    if (!root || !backdrop || !bridge || !exposure) {
      finish();
      return;
    }

    const photo = await waitForTimelinePhoto();

    if (!runningRef.current) return;

    animationRef.current?.kill();

    const strips = stripRefs.current.filter(
      (element): element is HTMLDivElement =>
        element !== null
    );

    // POINT22 DIRECTIONAL CONTINUITY V4
    // Forward movement travels from right to left,
    // matching Embla's normal scrollNext direction.
    const filmEdges = root.querySelectorAll<HTMLElement>(
      ".p22-negative-film-top, .p22-negative-film-bottom"
    );

    gsap.set(strips, {
      xPercent: 0,
      clipPath: "inset(0% 0% 0% 0%)",
    });

    gsap.set(filmEdges, {
      autoAlpha: 1,
      xPercent: 0,
    });

    if (!photo) {
      // Fallback: reveal the page normally
      // if the selected image isn't ready.
      const fallback = gsap.timeline({
        onComplete: finish,
      });

      animationRef.current = fallback;

      fallback.to(
        [title, caption],
        {
          autoAlpha: 0,
          duration: 0.2,
        },
        0
      );

      fallback.to(
        strips,
        {
          clipPath: "inset(0% 100% 0% 0%)",
          xPercent: -22,
          duration: 0.68,
          stagger: {
            each: 0.05,
            from: "end",
          },
          ease: "power3.inOut",
        },
        0
      );

      fallback.to(
        filmEdges,
        {
          autoAlpha: 0,
          xPercent: -25,
          duration: 0.48,
          ease: "power2.inOut",
        },
        0.12
      );

      fallback.to(
        [backdrop, exposure],
        {
          opacity: 0,
          duration: 0.45,
        },
        0.14
      );

      return;
    }

    // The selected photograph is now mounted.
    const rect = photo.getBoundingClientRect();
    const computed = window.getComputedStyle(photo);

    const source = photo.currentSrc || photo.src;

    // Use the browser's already loaded photograph,
    // not an unrelated image or placeholder.
    const clone = document.createElement("img");

    clone.src = source;
    clone.alt = "";
    clone.decoding = "async";
    clone.loading = "eager";

    clone.setAttribute("aria-hidden", "true");

    clone.style.display = "block";
    clone.style.width = "100%";
    clone.style.height = "100%";
    clone.style.objectFit =
      computed.objectFit || "cover";
    clone.style.objectPosition =
      computed.objectPosition || "center";

    // POINT22 DEVELOPING FRAME V6
    //
    // Two perfectly aligned copies of the same
    // incoming Timeline photograph.
    //
    // A photographic negative sits underneath
    // the original colour photograph.

    const negativeLayer = document.createElement("div");
    negativeLayer.className =
      "p22-negative-arrival-negative";

    const colourLayer = document.createElement("div");
    colourLayer.className =
      "p22-negative-arrival-colour";

    const colourImage =
      clone.cloneNode(true) as HTMLImageElement;

    negativeLayer.appendChild(clone);
    colourLayer.appendChild(colourImage);

    // Exposure boundary travels from
    // right to left across the photograph.
    const developmentLine =
      document.createElement("div");

    developmentLine.className =
      "p22-negative-arrival-development-line";

    developmentLine.setAttribute(
      "aria-hidden",
      "true"
    );

    bridge.replaceChildren(
      negativeLayer,
      colourLayer,
      developmentLine
    );

    // Start with the entire colour photograph
    // hidden behind its negative.
    gsap.set(colourLayer, {
      clipPath: "inset(0% 0% 0% 100%)",
    });

    gsap.set(developmentLine, {
      left: "100%",
      autoAlpha: 0,
    });

    // Begin as an enlarged, undeveloped
    // photographic print at screen centre.
    const initialWidth = Math.min(
      window.innerWidth * 0.76,
      980
    );

    const initialHeight = Math.min(
      window.innerHeight * 0.86,
      850
    );

    gsap.set(bridge, {
      // The developed print approaches from the
      // right before aligning with the Timeline.
      x:
        (window.innerWidth - initialWidth) / 2 +
        Math.min(window.innerWidth * 0.17, 200),
      y: (window.innerHeight - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
      autoAlpha: 1,
      clipPath: "inset(0% 49% 0% 49%)",
      filter: "none",
    });

    // ----------------------------------
    // DEVELOP / REGISTER / DISAPPEAR
    // ----------------------------------

    const timeline = gsap.timeline({
      onComplete: finish,
    });

    animationRef.current = timeline;

    timeline.to(
      [title, caption],
      {
        autoAlpha: 0,
        x: -48,
        y: -12,
        duration: 0.32,
        ease: "power2.in",
      },
      0
    );

    // The print develops from a narrow slit.
    timeline.to(
      bridge,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.52,
        ease: "power3.inOut",
      },
      0.04
    );

    // Five strips wipe from right to left,
    // matching the Timeline's forward direction.
    // The incoming photograph registers above them.
    timeline.to(
      strips,
      {
        clipPath: "inset(0% 100% 0% 0%)",
        xPercent: -22,
        duration: 0.72,
        stagger: {
          each: 0.055,
          from: "end",
        },
        ease: "power3.inOut",
      },
      0.10
    );

    // The film perforations follow the same
    // lateral motion instead of vanishing abruptly.
    timeline.to(
      filmEdges,
      {
        autoAlpha: 0,
        xPercent: -30,
        duration: 0.58,
        ease: "power2.inOut",
      },
      0.18
    );

    // POINT22 V6 — CHEMICAL DEVELOPMENT
    //
    // The exposed area expands from the right,
    // matching the forward movement of Timeline.
    // Both images stay perfectly registered.

    timeline.to(
      developmentLine,
      {
        autoAlpha: 1,
        duration: 0.09,
        ease: "power1.out",
      },
      0.32
    );

    timeline.to(
      colourLayer,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.72,
        ease: "power2.inOut",
      },
      0.36
    );

    // Follow the colour boundary precisely.
    timeline.to(
      developmentLine,
      {
        left: "0%",
        duration: 0.72,
        ease: "power2.inOut",
      },
      0.36
    );

    // Light dissipates as development finishes.
    timeline.to(
      developmentLine,
      {
        autoAlpha: 0,
        duration: 0.13,
        ease: "power1.out",
      },
      1.04
    );

    // The floating print becomes the
    // actual Timeline image underneath.
    timeline.to(
      bridge,
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.02,
        ease: "power4.inOut",
      },
      0.19
    );

    timeline.to(
      [backdrop, exposure],
      {
        opacity: 0,
        duration: 0.64,
        ease: "power2.out",
      },
      0.28
    );

    // The exact same image is already underneath.
    // Dissolving the duplicate completes the match.
    // The colour photograph is fully developed
    // before the duplicate dissolves into the
    // real Timeline photograph underneath.
    timeline.to(
      bridge,
      {
        autoAlpha: 0,
        duration: 0.16,
        ease: "power1.out",
      },
      1.20
    );
  }, [finish]);

  const handlePathChange = useCallback(
    (pathname: string) => {
      if (!waitingRef.current) return;
      if (pathname !== "/timeline") return;

      waitingRef.current = false;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          void revealTimeline();
        });
      });
    },
    [revealTimeline]
  );

  /*
   * EXIT:
   *
   * Capture the active homepage photograph,
   * extract it, and envelop it in photographic
   * strips before changing the route.
   */
  const navigateToTimeline = useCallback(() => {
    if (runningRef.current) return;

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      router.push("/timeline");
      return;
    }

    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const hero = heroRef.current;

    const title = titleRef.current;
    const caption = captionRef.current;
    const scan = scanRef.current;
    const bridge = arrivalRef.current;

    const exposure = exposureRef.current;
    const halo = exposureHaloRef.current;
    const spark = exposureSparkRef.current;

    const strips = stripRefs.current.filter(
      (element): element is HTMLDivElement =>
        element !== null
    );

    if (
      !root ||
      !backdrop ||
      !hero ||
      !title ||
      !caption ||
      !scan ||
      !bridge ||
      !exposure ||
      !halo ||
      !spark ||
      strips.length !== STRIP_COUNT
    ) {
      router.push("/timeline");
      return;
    }

    runningRef.current = true;
    waitingRef.current = true;

    const homePhotos = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        ".p22-reference-grid img"
      )
    );

    const featured =
      document.querySelector<HTMLImageElement>(
        ".p22-feature-panel img"
      ) ?? homePhotos[0];

    const sources = homePhotos
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean);

    const featuredSource =
      featured?.currentSrc ||
      featured?.src ||
      sources[0] ||
      "";

    const rect = featured?.getBoundingClientRect();

    // Populate the film with the homepage's
    // REAL photographic compositions.
    strips.forEach((strip, index) => {
      const source = sources[index % sources.length];

      strip.style.backgroundImage = source
        ? `url(${JSON.stringify(source)})`
        : "linear-gradient(135deg, #333, #090909)";
    });

    hero.style.backgroundImage = featuredSource
      ? `url(${JSON.stringify(featuredSource)})`
      : "linear-gradient(135deg, #333, #090909)";

    const grid =
      document.querySelector<HTMLElement>(
        ".p22-reference-grid"
      );

    outgoingGridRef.current = grid;

    animationRef.current?.kill();
    bridge.replaceChildren();

    gsap.set(root, {
      autoAlpha: 1,
      pointerEvents: "auto",
      clearProps: "transform",
    });

    // Start transparent. The homepage is still
    // visible when the photographed print lifts.
    gsap.set(backdrop, { opacity: 0 });

    gsap.set(strips, {
      yPercent: (index: number) =>
        index % 2 === 0 ? 112 : -112,
      xPercent: 0,
      clipPath: "inset(0% 0% 0% 0%)",
      opacity: 1,
      filter: "grayscale(1) contrast(1.25)",
    });

    // Restore the film edges for a new transition.
    gsap.set(
      root.querySelectorAll(
        ".p22-negative-film-top, .p22-negative-film-bottom"
      ),
      {
        autoAlpha: 1,
        xPercent: 0,
      }
    );

    gsap.set(hero, {
      x: rect?.left ?? window.innerWidth * 0.25,
      y: rect?.top ?? window.innerHeight * 0.15,
      width: rect?.width ?? window.innerWidth * 0.5,
      height: rect?.height ?? window.innerHeight * 0.65,
      rotation: 0,
      scale: 1,
      autoAlpha: 1,
      filter: "grayscale(0)",
    });

    gsap.set(title, {
      autoAlpha: 0,
      y: 75,
      scale: 1.08,
    });

    gsap.set(caption, {
      autoAlpha: 0,
      y: 20,
    });

    gsap.set(scan, {
      x: window.innerWidth + 60,
      autoAlpha: 0,
    });

    // Start exposure at the most recent pointer
    // position. On touch devices, use the centre.
    const pointer = lastPointerRef.current;

    const exposureX = pointer.seen
      ? pointer.x - window.innerWidth / 2
      : 0;

    const exposureY = pointer.seen
      ? pointer.y - window.innerHeight / 2
      : 0;

    gsap.set(exposure, {
      autoAlpha: 0,
    });

    gsap.set([halo, spark], {
      x: exposureX,
      y: exposureY,
    });

    gsap.set(bridge, {
      autoAlpha: 0,
    });

    const printWidth = Math.min(
      window.innerWidth * 0.48,
      660
    );

    const printHeight = Math.min(
      window.innerHeight * 0.7,
      750
    );

    const timeline = gsap.timeline();

    animationRef.current = timeline;

    if (grid) {
      timeline.to(
        grid,
        {
          scale: 0.975,
          filter: "brightness(0.55)",
          duration: 0.55,
          ease: "power3.inOut",
        },
        0
      );
    }

    // Extract the photograph from the page.
    timeline.to(
      hero,
      {
        x: (window.innerWidth - printWidth) / 2,
        y: (window.innerHeight - printHeight) / 2,
        width: printWidth,
        height: printHeight,
        rotation: -6,
        filter: "grayscale(1) contrast(1.2)",
        duration: 0.68,
        ease: "power4.inOut",
      },
      0
    );

    timeline.to(
      backdrop,
      {
        opacity: 1,
        duration: 0.52,
      },
      0.1
    );

    // Expose the photographic negatives.
    // Light appears as the contact sheet closes.
    timeline.to(
      exposure,
      {
        autoAlpha: 0.92,
        duration: 0.36,
        ease: "power2.out",
      },
      0.46
    );

    // Touch and non-hover devices receive
    // an automatic directional light sweep.
    if (
      !window.matchMedia(
        "(hover: hover) and (pointer: fine)"
      ).matches
    ) {
      timeline.to(
        halo,
        {
          x: -Math.min(window.innerWidth * 0.22, 100),
          y: -24,
          duration: 0.9,
          ease: "power2.inOut",
        },
        0.48
      );

      timeline.to(
        spark,
        {
          x: -Math.min(window.innerWidth * 0.27, 125),
          y: -12,
          duration: 0.78,
          ease: "power2.inOut",
        },
        0.52
      );
    }

    // Negative strips engulf the print.
    timeline.to(
      strips,
      {
        yPercent: 0,
        duration: 0.75,
        stagger: {
          each: 0.045,
          from: "edges",
        },
        ease: "power4.inOut",
      },
      0.23
    );

    timeline.to(
      hero,
      {
        autoAlpha: 0,
        rotation: -12,
        scale: 0.82,
        duration: 0.29,
      },
      0.56
    );

    // The red darkroom scan.
    timeline.to(
      scan,
      {
        autoAlpha: 1,
        duration: 0.1,
      },
      0.56
    );

    timeline.to(
      scan,
      {
        x: -80,
        duration: 0.65,
        ease: "power2.inOut",
      },
      0.58
    );

    timeline.to(
      scan,
      {
        autoAlpha: 0,
        duration: 0.12,
      },
      1.12
    );

    timeline.to(
      title,
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.48,
        ease: "power4.out",
      },
      0.7
    );

    timeline.to(
      caption,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.32,
      },
      0.88
    );

    // Change the route while completely
    // hidden behind the photographic negatives.
    timeline.call(
      () => router.push("/timeline"),
      undefined,
      1.22
    );

    clearSafety();

    // Never allow a failed navigation or missing
    // image to leave the interface inaccessible.
    timeoutRef.current = window.setTimeout(() => {
      if (!runningRef.current) return;

      animationRef.current?.kill();

      gsap.to(root, {
        autoAlpha: 0,
        duration: 0.3,
        onComplete: finish,
      });
    }, 7500);
  }, [router, clearSafety, finish]);

  // POINT22 V5: LIGHT-SENSITIVE POINTER TRACKING
  //
  // Two differently eased light sources create
  // a subtle photographic exposure effect.
  //
  // GSAP updates DOM transforms directly;
  // pointer movement never causes React renders.

  useEffect(() => {
    const halo = exposureHaloRef.current;
    const spark = exposureSparkRef.current;

    if (!halo || !spark) return;

    if (
      !window.matchMedia(
        "(hover: hover) and (pointer: fine)"
      ).matches
    ) {
      return;
    }

    const haloX = gsap.quickTo(halo, "x", {
      duration: 0.48,
      ease: "power3.out",
    });

    const haloY = gsap.quickTo(halo, "y", {
      duration: 0.48,
      ease: "power3.out",
    });

    const sparkX = gsap.quickTo(spark, "x", {
      duration: 0.19,
      ease: "power2.out",
    });

    const sparkY = gsap.quickTo(spark, "y", {
      duration: 0.19,
      ease: "power2.out",
    });

    const handlePointer = (event: PointerEvent) => {
      lastPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        seen: true,
      };

      if (!runningRef.current) return;

      const x = event.clientX - window.innerWidth / 2;
      const y = event.clientY - window.innerHeight / 2;

      haloX(x);
      haloY(y);

      sparkX(x);
      sparkY(y);
    };

    window.addEventListener(
      "pointermove",
      handlePointer,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointer
      );

      haloX.tween.kill();
      haloY.tween.kill();
      sparkX.tween.kill();
      sparkY.tween.kill();
    };
  }, []);

  useEffect(() => {
    router.prefetch("/timeline");
  }, [router]);

  useEffect(() => {
    return () => {
      clearSafety();
      animationRef.current?.kill();
    };
  }, [clearSafety]);

  return (
    <TransitionContext.Provider
      value={{ navigateToTimeline }}
    >
      <Suspense fallback={null}>
        <RouteObserver onChange={handlePathChange} />
      </Suspense>

      {children}

      <div
        ref={rootRef}
        className="p22-route-shutter p22-negative-transfer"
        aria-hidden="true"
      >
        <div
          ref={backdropRef}
          className="p22-negative-backdrop"
        />

        <div className="p22-negative-strips">
          {Array.from(
            { length: STRIP_COUNT },
            (_, index) => (
              <div
                key={index}
                ref={(node) => {
                  stripRefs.current[index] = node;
                }}
                className="p22-negative-strip"
              />
            )
          )}
        </div>

        <div
          ref={heroRef}
          className="p22-negative-hero"
        />

        <div className="p22-negative-film-top" />
        <div className="p22-negative-film-bottom" />

        <div
          ref={scanRef}
          className="p22-negative-scan"
        />

        {/* Light-sensitive photographic exposure.
            Purely decorative, with no hit-testing. */}
        <div
          ref={exposureRef}
          className="p22-negative-exposure"
        >
          <div
            ref={exposureHaloRef}
            className="p22-negative-exposure-halo"
          />

          <div
            ref={exposureSparkRef}
            className="p22-negative-exposure-spark"
          />
        </div>

        <div className="p22-negative-overlay">
          <div className="p22-negative-metadata">
            <span>POINT22® / NEGATIVE 003</span>
            <span>AN ARCHIVE OF MOMENTS</span>
          </div>

          <div className="p22-negative-centre">
            <div
              ref={titleRef}
              className="p22-negative-heading"
            >
              <span>TIME</span>
              <span>LINE</span>
            </div>

            <p
              ref={captionRef}
              className="p22-negative-caption"
            >
              EVERY FRAME IS A DIFFERENT REALITY
            </p>
          </div>

          <div className="p22-negative-footnote">
            <span>STRETCH22 / THROUGH MY EYES</span>
            <span>EXPOSURE → MEMORY</span>
          </div>
        </div>

        {/* The photographic handoff is rendered
            above both the film and the new page. */}
        <div
          ref={arrivalRef}
          className="p22-negative-arrival"
        />
      </div>
      <Suspense fallback={null}>
        <TimelineToProjectTransition />
      </Suspense>
      <Suspense fallback={null}>
        <ProjectToTimelineTransition />
      </Suspense>
    </TransitionContext.Provider>
  );
}
