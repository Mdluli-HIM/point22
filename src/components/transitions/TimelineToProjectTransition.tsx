"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";

const EVENT_NAME = "point22:timeline-project-open";
const SELECTION_KEY = "point22:timeline-project-selection";
const STRIP_COUNT = 5;

type Pending = {
  slug: string;
  source: string;
};

function imagePath(image: HTMLImageElement): string {
  try {
    const url = new URL(
      image.currentSrc || image.src,
      window.location.href
    );

    const path =
      url.pathname === "/_next/image"
        ? url.searchParams.get("url") ?? ""
        : url.pathname;

    return decodeURIComponent(path);
  } catch {
    return "";
  }
}

/*
 * Locate the visible Timeline photograph
 * nearest the centre of the viewport.
 */
function selectedTimelineImage() {
  const centreX = window.innerWidth / 2;
  const centreY = window.innerHeight / 2;

  return (
    Array.from(document.querySelectorAll<HTMLImageElement>("img"))
      .filter((image) => {
        if (!imagePath(image).includes("/images/stories/")) {
          return false;
        }

        if (!image.complete || image.naturalWidth === 0) {
          return false;
        }

        if (
          image.closest(
            ".p22-print-portal, .p22-negative-transfer"
          )
        ) {
          return false;
        }

        const rect = image.getBoundingClientRect();

        return (
          rect.width > 150 &&
          rect.height > 150 &&
          rect.right > 0 &&
          rect.left < window.innerWidth &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight
        );
      })
      .sort((a, b) => {
        const distance = (image: HTMLImageElement) => {
          const rect = image.getBoundingClientRect();

          return Math.hypot(
            (rect.left + rect.width / 2 - centreX) /
              window.innerWidth,
            (rect.top + rect.height / 2 - centreY) /
              window.innerHeight
          );
        };

        return distance(a) - distance(b);
      })[0] ?? null
  );
}

/*
 * The destination viewer may initially
 * render its first photograph and then
 * restore the photograph selected in Timeline.
 *
 * Wait for the correct image before registering.
 */
async function waitForProjectImage(expected: string) {
  const deadline = performance.now() + 2600;

  while (performance.now() < deadline) {
    const image =
      document.querySelector<HTMLImageElement>(
        ".p22-detail-main-photo img"
      );

    if (
      image &&
      image.complete &&
      image.naturalWidth > 0 &&
      imagePath(image) === expected
    ) {
      return image;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50);
    });
  }

  return null;
}

function makeImage(
  source: string,
  objectFit: string,
  objectPosition: string
) {
  const image = document.createElement("img");

  image.src = source;
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;

  image.setAttribute("aria-hidden", "true");

  image.style.objectFit = objectFit;
  image.style.objectPosition = objectPosition;

  return image;
}

export default function TimelineToProjectTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const rootRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const negativeRef = useRef<HTMLDivElement>(null);
  const colourRef = useRef<HTMLDivElement>(null);
  const fittedRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLDivElement>(null);

  // POINT22 COLLAPSING CONTACT SHEET V9
  const fragmentsRef = useRef<HTMLDivElement>(null);

  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pendingRef = useRef<Pending | null>(null);
  const runningRef = useRef(false);

  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    animationRef.current?.kill();
    animationRef.current = null;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const root = rootRef.current;

    if (root) {
      gsap.set(root, {
        autoAlpha: 0,
        pointerEvents: "none",
      });
    }

    negativeRef.current?.replaceChildren();
    colourRef.current?.replaceChildren();
    fittedRef.current?.replaceChildren();

    fragmentsRef.current?.replaceChildren();

    pendingRef.current = null;
    runningRef.current = false;
  }, []);

  /*
   * ARRIVAL — PERFECT PHOTOGRAPHIC REGISTRATION
   */
  const enterProject = useCallback(async () => {
    const pending = pendingRef.current;

    const root = rootRef.current;
    const paper = paperRef.current;
    const print = printRef.current;
    const fitted = fittedRef.current;
    const title = titleRef.current;

    if (!pending || !root || !paper || !print || !fitted) {
      finish();
      return;
    }

    const targetImage = await waitForProjectImage(
      pending.source
    );

    // Ignore a stale async completion after
    // another navigation or cleanup.
    if (pendingRef.current !== pending) return;

    animationRef.current?.kill();

    if (!targetImage) {
      const fallback = gsap.timeline({
        onComplete: finish,
      });

      animationRef.current = fallback;

      fallback.to(root, {
        autoAlpha: 0,
        duration: 0.45,
        ease: "power2.out",
      });

      return;
    }

    const rect = targetImage.getBoundingClientRect();
    const style = getComputedStyle(targetImage);

    const fittedImage =
      fitted.querySelector<HTMLImageElement>("img");

    if (fittedImage) {
      fittedImage.style.objectFit =
        style.objectFit || "contain";

      fittedImage.style.objectPosition =
        style.objectPosition || "center";
    }

    // The floating photograph now becomes
    // the actual image in the project viewer.
    const animation = gsap.timeline({
      onComplete: finish,
    });

    animationRef.current = animation;

    // POINT22 V9 — FILM REGISTRATION
    const registrationMarks =
      root.querySelectorAll<HTMLElement>(
        ".p22-print-v9-register"
      );

    gsap.set(registrationMarks, {
      autoAlpha: 0,
      scale: 1.3,
    });

    animation.to(
      registrationMarks,
      {
        autoAlpha: 0.95,
        scale: 1,
        duration: 0.27,
        stagger: 0.055,
        ease: "power3.out",
      },
      0.35
    );

    animation.to(
      registrationMarks,
      {
        autoAlpha: 0,
        duration: 0.2,
      },
      0.83
    );

    animation.to(
      print,
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        boxShadow: "0 0 0 rgba(0,0,0,0)",
        duration: 1.02,
        ease: "power4.inOut",
      },
      0
    );

    // Crossfade from the original Timeline crop
    // into the project viewer's contain treatment.
    animation.to(
      fitted,
      {
        autoAlpha: 1,
        duration: 0.45,
        ease: "power2.inOut",
      },
      0.27
    );

    if (title) {
      animation.to(
        title,
        {
          autoAlpha: 0,
          x: -48,
          duration: 0.4,
          ease: "power2.in",
        },
        0
      );
    }

    // Remove the temporary paper only after
    // the new route has rendered underneath.
    animation.to(
      paper,
      {
        autoAlpha: 0,
        duration: 0.52,
        ease: "power2.out",
      },
      0.38
    );

    // The real photograph and its duplicate
    // are now aligned.
    animation.to(
      print,
      {
        autoAlpha: 0,
        duration: 0.16,
        ease: "power1.out",
      },
      1.02
    );
  }, [finish]);

  /*
   * Observe the destination route without
   * removing the animated portal.
   */
  useEffect(() => {
    const pending = pendingRef.current;

    if (!pending) return;

    if (pathname !== `/timeline/${pending.slug}`) {
      return;
    }

    let cancelled = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          void enterProject();
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, enterProject]);

  /*
   * EXIT — PHOTOGRAPHIC PRINT LAB
   */
  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (
        event as CustomEvent<{ slug: string }>
      ).detail;

      const slug = detail?.slug;

      if (
        !slug ||
        !/^[a-z0-9-]+$/.test(slug) ||
        runningRef.current
      ) {
        return;
      }

      const destination = `/timeline/${slug}`;

      if (pathname !== "/timeline") {
        router.push(destination);
        return;
      }

      const selected = selectedTimelineImage();

      const source = selected
        ? imagePath(selected)
        : "";

      // Maintain the existing exact-image
      // handoff to TimelineProjectViewer.
      try {
        window.sessionStorage.setItem(
          SELECTION_KEY,
          JSON.stringify({
            slug,
            source,
            at: Date.now(),
          })
        );
      } catch {
        // Storage restrictions must not block navigation.
      }

      if (
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        router.push(destination);
        return;
      }

      const root = rootRef.current;
      const dark = darkRef.current;
      const paper = paperRef.current;
      const print = printRef.current;

      const negative = negativeRef.current;
      const colour = colourRef.current;
      const fitted = fittedRef.current;
      const beam = beamRef.current;
      const halo = haloRef.current;
      const title = titleRef.current;
      const fragments = fragmentsRef.current;

      const strips = stripRefs.current.filter(
        (node): node is HTMLDivElement =>
          node !== null
      );

      if (
        !selected ||
        !root ||
        !dark ||
        !paper ||
        !print ||
        !negative ||
        !colour ||
        !fitted ||
        !beam ||
        !halo ||
        !title ||
        !fragments ||
        strips.length !== STRIP_COUNT
      ) {
        router.push(destination);
        return;
      }

      runningRef.current = true;
      pendingRef.current = { slug, source };

      const rect = selected.getBoundingClientRect();
      const selectedStyle = getComputedStyle(selected);

      // POINT22 V9 — PHOTOGRAPHIC FRAGMENTATION
      //
      // Capture real neighbouring Timeline
      // photographs, not placeholder imagery.
      //
      // Use fewer fragments on smaller screens
      // to preserve mobile performance.

      fragments.replaceChildren();

      const maxFragments = window.matchMedia(
        "(max-width: 760px)"
      ).matches ? 2 : 4;

      const selectedCentre =
        rect.left + rect.width / 2;

      const neighbours = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          "img"
        )
      )
        .filter((image) => {
          if (image === selected) return false;

          if (
            !imagePath(image).includes(
              "/images/stories/"
            )
          ) {
            return false;
          }

          if (
            image.closest(
              ".p22-print-portal, .p22-negative-transfer"
            )
          ) {
            return false;
          }

          if (
            !image.complete ||
            image.naturalWidth === 0
          ) {
            return false;
          }

          const box = image.getBoundingClientRect();

          return (
            box.width > 140 &&
            box.height > 140 &&
            box.right > 0 &&
            box.left < window.innerWidth &&
            box.bottom > 0 &&
            box.top < window.innerHeight
          );
        })
        .sort((a, b) => {
          const centre = (image: HTMLImageElement) => {
            const box = image.getBoundingClientRect();

            return box.left + box.width / 2;
          };

          return (
            Math.abs(centre(a) - selectedCentre) -
            Math.abs(centre(b) - selectedCentre)
          );
        })
        .slice(0, maxFragments);

      const photoFragments = neighbours.map((image) => {
        const box = image.getBoundingClientRect();
        const style = getComputedStyle(image);

        const fragment = document.createElement(
          "div"
        );

        fragment.className =
          "p22-print-v9-fragment";

        const picture = makeImage(
          image.currentSrc || image.src,
          style.objectFit || "cover",
          style.objectPosition || "center"
        );

        fragment.appendChild(picture);
        fragments.appendChild(fragment);

        gsap.set(fragment, {
          x: box.left,
          y: box.top,
          width: box.width,
          height: box.height,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scale: 1,
          autoAlpha: 1,
          transformPerspective: 1100,
          transformOrigin: "50% 50%",
        });

        return fragment;
      });

      const originalSource =
        selected.currentSrc || selected.src;

      const objectFit =
        selectedStyle.objectFit || "cover";

      const objectPosition =
        selectedStyle.objectPosition || "center";

      // Three copies of ONE photograph:
      // negative, original colour and fitted print.
      negative.replaceChildren(
        makeImage(
          originalSource,
          objectFit,
          objectPosition
        )
      );

      colour.replaceChildren(
        makeImage(
          originalSource,
          objectFit,
          objectPosition
        )
      );

      fitted.replaceChildren(
        makeImage(
          originalSource,
          "contain",
          "center"
        )
      );

      // Five film frames all use the exact
      // photograph selected by the visitor.
      strips.forEach((strip, index) => {
        strip.style.backgroundImage =
          `url(${JSON.stringify(originalSource)})`;

        strip.style.backgroundPosition =
          `${(index / (STRIP_COUNT - 1)) * 100}% center`;
      });

      title.textContent = "22";

      animationRef.current?.kill();

      gsap.set(root, {
        autoAlpha: 1,
        pointerEvents: "auto",
      });

      gsap.set(dark, { autoAlpha: 0 });

      gsap.set(paper, {
        autoAlpha: 1,
        clipPath: "circle(0% at 50% 50%)",
      });

      gsap.set(strips, {
        yPercent: (index: number) =>
          index % 2 === 0 ? -110 : 110,
        xPercent: 0,
        clipPath: "inset(0% 0% 0% 0%)",
        autoAlpha: 1,
      });

      gsap.set(print, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        autoAlpha: 1,
        filter: "none",
        boxShadow: "0 18px 65px rgba(0,0,0,0.3)",
      });

      gsap.set(negative, {
        autoAlpha: 1,
      });

      gsap.set(colour, {
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0%)",
      });

      gsap.set(fitted, {
        autoAlpha: 0,
      });

      gsap.set(beam, {
        left: "100%",
        autoAlpha: 0,
      });

      gsap.set(halo, {
        autoAlpha: 0,
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
      });

      gsap.set(title, {
        autoAlpha: 0,
        x: 75,
      });

      const printWidth = Math.min(
        window.innerWidth * 0.51,
        690
      );

      const printHeight = Math.min(
        window.innerHeight * 0.76,
        790
      );

      const animation = gsap.timeline();

      animationRef.current = animation;

      // 01 / EXTRACT
      animation.to(
        dark,
        {
          autoAlpha: 1,
          duration: 0.48,
          ease: "power2.out",
        },
        0.06
      );

      // The surrounding contact-sheet images
      // peel away from the carousel, rotate in
      // depth and collapse behind the print.
      //
      // The central selected photograph remains
      // unchanged and receives the V8 development.

      if (photoFragments.length > 0) {
        animation.to(
          photoFragments,
          {
            x: (index: number) =>
              (window.innerWidth -
                photoFragments[index].offsetWidth) / 2,

            y: (index: number) =>
              (window.innerHeight -
                photoFragments[index].offsetHeight) / 2,

            rotationY: (index: number) =>
              index % 2 === 0 ? 72 : -72,

            rotationZ: (index: number) =>
              index % 2 === 0 ? -17 : 17,

            scale: 0.14,
            autoAlpha: 0,

            duration: 0.88,
            stagger: {
              each: 0.055,
              from: "edges",
            },
            ease: "power4.inOut",
          },
          0.12
        );
      }

      animation.to(
        print,
        {
          x: (window.innerWidth - printWidth) / 2,
          y: (window.innerHeight - printHeight) / 2,
          width: printWidth,
          height: printHeight,
          rotation: -5,
          duration: 0.66,
          ease: "power4.inOut",
        },
        0
      );

      // 02 / FRACTURE
      animation.to(
        strips,
        {
          yPercent: 0,
          duration: 0.68,
          stagger: {
            each: 0.04,
            from: "edges",
          },
          ease: "power4.inOut",
        },
        0.2
      );

      // Original photograph becomes a negative.
      animation.to(
        colour,
        {
          autoAlpha: 0,
          duration: 0.23,
        },
        0.42
      );

      // 03 / EXPOSE
      animation.to(
        halo,
        {
          autoAlpha: 0.85,
          duration: 0.3,
        },
        0.43
      );

      animation.to(
        title,
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.38,
          ease: "power3.out",
        },
        0.48
      );

      // 04 / DEVELOP
      animation.set(
        colour,
        {
          autoAlpha: 1,
          clipPath: "inset(0% 0% 0% 100%)",
        },
        0.69
      );

      animation.set(
        beam,
        {
          left: "100%",
          autoAlpha: 1,
        },
        0.69
      );

      animation.to(
        colour,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.72,
          ease: "power2.inOut",
        },
        0.69
      );

      animation.to(
        beam,
        {
          left: "0%",
          duration: 0.72,
          ease: "power2.inOut",
        },
        0.69
      );

      // The darkroom transforms into white paper.
      animation.to(
        paper,
        {
          clipPath: "circle(150% at 50% 50%)",
          duration: 0.75,
          ease: "power3.inOut",
        },
        0.78
      );

      // 05 / RELEASE THE FILM STRIPS
      // Maintain the Timeline's leftward direction.
      animation.to(
        strips,
        {
          clipPath: "inset(0% 100% 0% 0%)",
          xPercent: -18,
          duration: 0.63,
          stagger: {
            each: 0.035,
            from: "end",
          },
          ease: "power3.inOut",
        },
        0.91
      );

      animation.to(
        halo,
        {
          autoAlpha: 0,
          duration: 0.4,
        },
        1.03
      );

      animation.to(
        beam,
        {
          autoAlpha: 0,
          duration: 0.12,
        },
        1.32
      );

      // Navigate when the old Timeline is
      // covered, retaining the physical print.
      animation.call(
        () => router.push(destination),
        undefined,
        1.58
      );

      // Always allow recovery from a stalled
      // image or route transition.
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(
        finish,
        8500
      );
    };

    window.addEventListener(EVENT_NAME, handleOpen);

    return () => {
      window.removeEventListener(
        EVENT_NAME,
        handleOpen
      );
    };
  }, [pathname, router, finish]);

  /*
   * Light-sensitive pointer interaction.
   * No React state updates on pointer movement.
   */
  useEffect(() => {
    const halo = haloRef.current;

    if (!halo) return;

    const moveX = gsap.quickTo(halo, "x", {
      duration: 0.48,
      ease: "power3.out",
    });

    const moveY = gsap.quickTo(halo, "y", {
      duration: 0.48,
      ease: "power3.out",
    });

    const onPointerMove = (event: PointerEvent) => {
      if (!runningRef.current) return;

      moveX(event.clientX - window.innerWidth / 2);
      moveY(event.clientY - window.innerHeight / 2);
    };

    window.addEventListener(
      "pointermove",
      onPointerMove,
      { passive: true }
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        onPointerMove
      );

      moveX.tween.kill();
      moveY.tween.kill();
    };
  }, []);

  useEffect(() => {
    return () => {
      animationRef.current?.kill();

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="p22-print-portal p22-print-v8"
      aria-hidden="true"
    >
      <div
        ref={darkRef}
        className="p22-print-portal-dark"
      />

      <div
        ref={paperRef}
        className="p22-print-portal-paper"
      />

      {/* The selected image becomes
          a five-frame photographic negative. */}
      <div className="p22-print-v8-strips">
        {Array.from(
          { length: STRIP_COUNT },
          (_, index) => (
            <div
              key={index}
              ref={(node) => {
                stripRefs.current[index] = node;
              }}
              className="p22-print-v8-strip"
            />
          )
        )}
      </div>

      {/* The surrounding Timeline photographs
          collapse into a single photographic print. */}
      <div
        ref={fragmentsRef}
        className="p22-print-v9-fragments"
        aria-hidden="true"
      />

      {/* Three perfectly aligned treatments
          of the very same photograph. */}
      <div
        ref={printRef}
        className="p22-print-portal-photo p22-print-v8-print"
      >
        <div
          ref={negativeRef}
          className="p22-print-v8-negative"
        />

        <div
          ref={colourRef}
          className="p22-print-v8-colour"
        />

        <div
          ref={fittedRef}
          className="p22-print-v8-fitted"
        />

        <div
          ref={beamRef}
          className="p22-print-v8-beam"
        />

        {/* Photographic registration marks.
            They appear briefly as the print
            aligns with the destination frame. */}
        <span className="p22-print-v9-register top-left" />
        <span className="p22-print-v9-register top-right" />
        <span className="p22-print-v9-register bottom-left" />
        <span className="p22-print-v9-register bottom-right" />
      </div>

      <div
        ref={haloRef}
        className="p22-print-v8-light"
      />

      <div className="p22-print-v8-perforations top" />
      <div className="p22-print-v8-perforations bottom" />

      <div className="p22-print-portal-editorial p22-print-v8-editorial">
        <span>POINT22® / PRINT LAB 008</span>

        <div className="p22-print-portal-titles">
          <span>AN IMAGE REMOVED FROM TIME</span>

          <strong ref={titleRef}>
            22
          </strong>

          <span>EXPOSURE / DEVELOPMENT / MEMORY</span>
        </div>

        <span>STRETCH22 / THE ARCHIVE CONTINUES</span>
      </div>
    </div>
  );
}
