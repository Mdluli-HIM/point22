"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type ArchiveMotionProps = {
  activeIndex: number;
  onNavigate: (direction: number) => void;
};

export default function ArchiveMotion({
  activeIndex,
  onNavigate,
}: ArchiveMotionProps) {
  const firstRender = useRef(true);
  const navigateRef = useRef(onNavigate);

  useEffect(() => {
    navigateRef.current = onNavigate;
  }, [onNavigate]);

  // Cinematic entrance after the Stretch screen disappears.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      ".p22-reference-home"
    );

    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let started = false;
    let context: gsap.Context | null = null;

    const reveal = () => {
      if (started) return;

      // Wait for the actual intro overlay to disappear.
      if (document.querySelector(".p22-intro")) return;

      started = true;
      observer.disconnect();

      if (reducedMotion) return;

      context = gsap.context(() => {
        const timeline = gsap.timeline({
          defaults: {
            ease: "power3.out",
          },
        });

        // Main image reveals first.
        timeline.fromTo(
          ".p22-feature-panel",
          {
            opacity: 0,
            y: 26,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1.05,
          },
          0
        );

        timeline.fromTo(
          ".p22-feature-panel img",
          {
            scale: 1.09,
          },
          {
            scale: 1,
            duration: 1.65,
            ease: "power2.out",
          },
          0
        );

        // Three supporting photographs reveal sequentially.
        timeline.fromTo(
          ".p22-side-top, .p22-side-middle, .p22-side-tall",
          {
            opacity: 0,
            y: 32,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.95,
            stagger: 0.12,
          },
          0.18
        );

        // Cinematic strip enters from the bottom.
        timeline.fromTo(
          ".p22-film-strip",
          {
            opacity: 0,
            y: 38,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
          },
          0.43
        );

        // Minimal navigation follows the images.
        timeline.fromTo(
          ".p22-topbar-brand, .p22-topbar-nav, .p22-topbar-right",
          {
            opacity: 0,
            y: -15,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.08,
          },
          0.3
        );

        timeline.fromTo(
          ".p22-reference-footer",
          {
            opacity: 0,
            y: 12,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
          },
          0.72
        );
      }, root);
    };

    const observer = new MutationObserver(reveal);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const frame = requestAnimationFrame(reveal);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      context?.revert();
    };
  }, []);

  // Animate changes to the featured photograph.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) return;

    const image = document.querySelector<HTMLElement>(
      ".p22-feature-panel img"
    );

    const copy = document.querySelector<HTMLElement>(
      ".p22-feature-copy"
    );

    const animations: gsap.core.Tween[] = [];

    if (image) {
      animations.push(
        gsap.fromTo(
          image,
          {
            opacity: 0.45,
            scale: 1.075,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 0.95,
            ease: "power3.out",
            overwrite: "auto",
          }
        )
      );
    }

    if (copy) {
      animations.push(
        gsap.fromTo(
          copy,
          {
            opacity: 0.4,
            y: 13,
          },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power2.out",
            overwrite: "auto",
          }
        )
      );
    }

    return () => {
      animations.forEach((animation) => animation.kill());
    };
  }, [activeIndex]);

  // Subtle optical image movement on desktop.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      ".p22-reference-home"
    );

    if (!root) return;

    const isDesktop = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!isDesktop || reducedMotion) return;

    const panels = root.querySelectorAll<HTMLElement>(
      ".p22-feature-panel, .p22-side-card, .p22-film-strip"
    );

    const cleanups: Array<() => void> = [];

    panels.forEach((panel) => {
      const image = panel.querySelector<HTMLElement>("img");

      if (!image) return;

      const moveX = gsap.quickTo(image, "x", {
        duration: 0.75,
        ease: "power3.out",
      });

      const moveY = gsap.quickTo(image, "y", {
        duration: 0.75,
        ease: "power3.out",
      });

      const onMove = (event: PointerEvent) => {
        const rect = panel.getBoundingClientRect();

        const x =
          (event.clientX - rect.left) / rect.width - 0.5;

        const y =
          (event.clientY - rect.top) / rect.height - 0.5;

        moveX(x * 14);
        moveY(y * 14);
      };

      const onEnter = () => {
        gsap.to(image, {
          scale: 1.045,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        });
      };

      const onLeave = () => {
        moveX(0);
        moveY(0);

        gsap.to(image, {
          scale: 1,
          duration: 0.85,
          ease: "power3.out",
          overwrite: "auto",
        });
      };

      panel.addEventListener("pointermove", onMove);
      panel.addEventListener("pointerenter", onEnter);
      panel.addEventListener("pointerleave", onLeave);

      cleanups.push(() => {
        panel.removeEventListener("pointermove", onMove);
        panel.removeEventListener("pointerenter", onEnter);
        panel.removeEventListener("pointerleave", onLeave);

        gsap.killTweensOf(image);
        gsap.set(image, {
          clearProps: "x,y,scale",
        });
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  // Swipe / drag the main image to navigate.
  useEffect(() => {
    const panel = document.querySelector<HTMLElement>(
      ".p22-feature-panel"
    );

    if (!panel) return;

    let start: { x: number; y: number } | null = null;

    const onDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("button, a")
      ) {
        return;
      }

      start = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onUp = (event: PointerEvent) => {
      if (!start) return;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      start = null;

      if (
        Math.abs(deltaX) > 60 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.2
      ) {
        navigateRef.current(deltaX < 0 ? 1 : -1);
      }
    };

    const onCancel = () => {
      start = null;
    };

    const onDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    panel.addEventListener("pointerdown", onDown);
    panel.addEventListener("dragstart", onDragStart);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);

    return () => {
      panel.removeEventListener("pointerdown", onDown);
      panel.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  return null;
}
