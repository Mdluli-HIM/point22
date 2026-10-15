"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";

const EVENT = "point22:project-return";
const STORAGE = "point22:timeline-return-photo";

type ReturnFrame = {
  slug: string;
  source: string;
};

function imagePath(value: string): string {
  try {
    const url = new URL(value, window.location.href);

    const path =
      url.pathname === "/_next/image"
        ? url.searchParams.get("url") ?? ""
        : url.pathname;

    return decodeURIComponent(path);
  } catch {
    return value;
  }
}

async function findReturnedPhoto(source: string) {
  const deadline = performance.now() + 3000;

  while (performance.now() < deadline) {
    const images = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        ".p22-carousel-photo img"
      )
    );

    const image = images.find((candidate) => {
      if (
        imagePath(candidate.currentSrc || candidate.src) !==
        source
      ) {
        return false;
      }

      const rect = candidate.getBoundingClientRect();
      const centre = rect.left + rect.width / 2;

      return (
        candidate.complete &&
        candidate.naturalWidth > 0 &&
        rect.width > 100 &&
        Math.abs(centre - window.innerWidth / 2) <
          window.innerWidth * 0.3
      );
    });

    if (image) return image;

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50);
    });
  }

  return null;
}

function createPhotograph(
  source: string,
  fit: string,
  position: string
) {
  const image = document.createElement("img");

  image.src = source;
  image.alt = "";
  image.decoding = "async";
  image.draggable = false;
  image.setAttribute("aria-hidden", "true");

  image.style.objectFit = fit;
  image.style.objectPosition = position;

  return image;
}

export default function ProjectToTimelineTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const rootRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const colourRef = useRef<HTMLDivElement>(null);
  const negativeRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const stripsRef = useRef<(HTMLDivElement | null)[]>([]);

  const pendingRef = useRef<ReturnFrame | null>(null);
  const busyRef = useRef(false);
  const enteringRef = useRef(false);

  const animationRef = useRef<gsap.core.Timeline | null>(
    null
  );

  const timeoutRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    animationRef.current?.kill();
    animationRef.current = null;

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (rootRef.current) {
      gsap.set(rootRef.current, {
        autoAlpha: 0,
        pointerEvents: "none",
      });
    }

    colourRef.current?.replaceChildren();
    negativeRef.current?.replaceChildren();

    busyRef.current = false;
    enteringRef.current = false;
    pendingRef.current = null;
  }, []);

  // ---------------------------------------
  // ARRIVAL: RETURN THE PRINT TO TIMELINE
  // ---------------------------------------

  const enterTimeline = useCallback(async () => {
    const pending = pendingRef.current;

    const root = rootRef.current;
    const dark = darkRef.current;
    const print = printRef.current;
    const colour = colourRef.current;
    const title = titleRef.current;
    const beam = beamRef.current;

    if (
      !pending ||
      !root ||
      !dark ||
      !print ||
      !colour ||
      !beam
    ) {
      finish();
      return;
    }

    const target = await findReturnedPhoto(pending.source);

    if (pendingRef.current !== pending) return;

    animationRef.current?.kill();

    if (!target) {
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

    const rect = target.getBoundingClientRect();
    const style = window.getComputedStyle(target);

    const colourImage =
      colour.querySelector<HTMLImageElement>("img");

    if (colourImage) {
      colourImage.style.objectFit =
        style.objectFit || "cover";

      colourImage.style.objectPosition =
        style.objectPosition || "center";
    }

    const strips = stripsRef.current.filter(
      (item): item is HTMLDivElement => item !== null
    );

    // The five strips now represent the
    // photographs around the restored slide.
    const surrounding = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        ".p22-carousel-photo img"
      )
    ).filter((image) => image.complete && image.naturalWidth);

    const centre = window.innerWidth / 2;

    surrounding.sort((a, b) => {
      const ax = a.getBoundingClientRect();
      const bx = b.getBoundingClientRect();

      return (
        Math.abs(ax.left + ax.width / 2 - centre) -
        Math.abs(bx.left + bx.width / 2 - centre)
      );
    });

    strips.forEach((strip, index) => {
      const source = surrounding[index];

      if (source) {
        strip.style.backgroundImage = `url(${JSON.stringify(
          source.currentSrc || source.src
        )})`;
      }
    });

    gsap.set(strips, {
      xPercent: 0,
      autoAlpha: 1,
      clipPath: "inset(0% 0% 0% 0%)",
    });

    const animation = gsap.timeline({
      onComplete: finish,
    });

    animationRef.current = animation;

    // The negative develops into the same
    // colour photograph shown in Timeline.
    animation.to(
      colour,
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.72,
        ease: "power2.inOut",
      },
      0.13
    );

    animation.to(
      beam,
      {
        left: "0%",
        autoAlpha: 1,
        duration: 0.72,
        ease: "power2.inOut",
      },
      0.13
    );

    // Restore the photographic print into
    // Embla's exact selected-image rectangle.
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
      0.12
    );

    // Reassemble the Timeline around it.
    animation.to(
      strips,
      {
        xPercent: -115,
        autoAlpha: 0,
        duration: 0.8,
        stagger: {
          each: 0.045,
          from: "end",
        },
        ease: "power4.inOut",
      },
      0.16
    );

    animation.to(
      dark,
      {
        autoAlpha: 0,
        duration: 0.55,
      },
      0.46
    );

    if (title) {
      animation.to(
        title,
        {
          autoAlpha: 0,
          x: -65,
          duration: 0.38,
        },
        0.11
      );
    }

    animation.to(
      beam,
      {
        autoAlpha: 0,
        duration: 0.16,
      },
      0.92
    );

    // The real photograph is already beneath
    // its duplicate, so the last fade is invisible.
    animation.to(
      print,
      {
        autoAlpha: 0,
        duration: 0.14,
      },
      1.11
    );
  }, [finish]);

  useEffect(() => {
    if (
      pathname !== "/timeline" ||
      !pendingRef.current ||
      enteringRef.current
    ) {
      return;
    }

    enteringRef.current = true;

    const frame = requestAnimationFrame(() => {
      void enterTimeline();
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, enterTimeline]);

  // ---------------------------------------
  // EXIT: LIFT PHOTO FROM WHITE VIEWING ROOM
  // ---------------------------------------

  useEffect(() => {
    const returnToTimeline = () => {
      if (busyRef.current) return;

      if (!pathname.startsWith("/timeline/")) return;

      const image =
        document.querySelector<HTMLImageElement>(
          ".p22-detail-main-photo img"
        );

      const slug = pathname.split("/").pop() ?? "";

      if (!slug || !/^[a-z0-9-]+$/.test(slug)) return;

      const source = image
        ? imagePath(image.currentSrc || image.src)
        : "";

      if (source.startsWith("/images/stories/")) {
        try {
          window.sessionStorage.setItem(
            STORAGE,
            JSON.stringify({
              slug,
              source,
              at: Date.now(),
            })
          );
        } catch {
          // Storage restrictions must not
          // prevent normal navigation.
        }
      }

      const destination = "/timeline";

      if (
        !image ||
        !image.complete ||
        image.naturalWidth === 0 ||
        !source ||
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
      ) {
        router.push(destination);
        return;
      }

      const root = rootRef.current;
      const dark = darkRef.current;
      const print = printRef.current;
      const colour = colourRef.current;
      const negative = negativeRef.current;
      const beam = beamRef.current;
      const title = titleRef.current;

      const strips = stripsRef.current.filter(
        (item): item is HTMLDivElement => item !== null
      );

      if (
        !root ||
        !dark ||
        !print ||
        !colour ||
        !negative ||
        !beam ||
        !title ||
        strips.length !== 5
      ) {
        router.push(destination);
        return;
      }

      busyRef.current = true;
      pendingRef.current = { slug, source };
      enteringRef.current = false;

      const rect = image.getBoundingClientRect();
      const style = window.getComputedStyle(image);

      const actualSource = image.currentSrc || image.src;
      const fit = style.objectFit || "contain";
      const position = style.objectPosition || "center";

      colour.replaceChildren(
        createPhotograph(actualSource, fit, position)
      );

      negative.replaceChildren(
        createPhotograph(actualSource, fit, position)
      );

      const thumbnailSources = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          ".p22-detail-thumb img"
        )
      ).map((img) => img.currentSrc || img.src);

      strips.forEach((strip, index) => {
        const src =
          thumbnailSources[index] || actualSource;

        strip.style.backgroundImage =
          `url(${JSON.stringify(src)})`;
      });

      animationRef.current?.kill();

      gsap.set(root, {
        autoAlpha: 1,
        pointerEvents: "auto",
      });

      gsap.set(dark, {
        autoAlpha: 0,
      });

      gsap.set(print, {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        rotation: 0,
        autoAlpha: 1,
      });

      gsap.set(colour, {
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0%)",
      });

      gsap.set(negative, {
        autoAlpha: 1,
      });

      gsap.set(beam, {
        left: "100%",
        autoAlpha: 0,
      });

      gsap.set(title, {
        autoAlpha: 0,
        y: 35,
        x: 0,
      });

      gsap.set(strips, {
        xPercent: (index: number) =>
          index % 2 === 0 ? 115 : -115,
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0%)",
      });

      const width = Math.min(
        window.innerWidth * 0.48,
        680
      );

      const height = Math.min(
        window.innerHeight * 0.76,
        790
      );

      const animation = gsap.timeline();

      animationRef.current = animation;

      // Remove the print from the white room.
      animation.to(
        print,
        {
          x: (window.innerWidth - width) / 2,
          y: (window.innerHeight - height) / 2,
          width,
          height,
          rotation: 6,
          duration: 0.72,
          ease: "power4.inOut",
        },
        0
      );

      // The viewing room becomes a darkroom.
      animation.to(
        dark,
        {
          autoAlpha: 1,
          duration: 0.68,
          ease: "power2.inOut",
        },
        0.07
      );

      // Remove colour, revealing the negative.
      animation.to(
        colour,
        {
          autoAlpha: 0,
          duration: 0.4,
        },
        0.42
      );

      animation.to(
        strips,
        {
          xPercent: 0,
          duration: 0.76,
          stagger: {
            each: 0.05,
            from: "edges",
          },
          ease: "power4.inOut",
        },
        0.21
      );

      animation.to(
        title,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.4,
          ease: "power3.out",
        },
        0.62
      );

      // The old page is hidden behind the
      // negative before navigation occurs.
      animation.call(
        () => router.push(destination),
        undefined,
        1.18
      );

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(
        finish,
        8000
      );
    };

    window.addEventListener(EVENT, returnToTimeline);

    return () => {
      window.removeEventListener(
        EVENT,
        returnToTimeline
      );
    };
  }, [pathname, router, finish]);

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
      className="p22-return-portal"
      aria-hidden="true"
    >
      <div
        ref={darkRef}
        className="p22-return-dark"
      />

      <div className="p22-return-film">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            ref={(node) => {
              stripsRef.current[index] = node;
            }}
            className="p22-return-strip"
          />
        ))}
      </div>

      <div
        ref={printRef}
        className="p22-return-print"
      >
        <div
          ref={negativeRef}
          className="p22-return-negative"
        />

        <div
          ref={colourRef}
          className="p22-return-colour"
        />

        <div
          ref={beamRef}
          className="p22-return-beam"
        />
      </div>

      <div className="p22-return-editorial">
        <span>POINT22® / NEGATIVE 010</span>

        <div
          ref={titleRef}
          className="p22-return-heading"
        >
          <span>BACK TO</span>
          <strong>22</strong>
          <span>REASSEMBLING MEMORY</span>
        </div>

        <span>STRETCH22 / FRAME RETURN</span>
      </div>
    </div>
  );
}
