"use client";

import { useEffect } from "react";

const panelSelectors = [
  ".p22-feature-panel",
  ".p22-side-top",
  ".p22-side-middle",
  ".p22-side-tall",
  ".p22-film-strip",
];

export default function ArchiveColorFocus() {
  useEffect(() => {
    const gallery = document.querySelector<HTMLElement>(
      ".p22-reference-grid"
    );

    if (!gallery) return;

    const panels = panelSelectors
      .map((selector) =>
        gallery.querySelector<HTMLElement>(selector)
      )
      .filter(
        (panel): panel is HTMLElement => panel !== null
      );

    if (panels.length !== panelSelectors.length) return;

    let defaultIndex = -1;
    let enabled = false;
    let scheduled = false;
    let timer: number | undefined;

    function highlight(index: number) {
      if (!enabled) return;

      panels.forEach((panel, i) => {
        panel.dataset.p22Color =
          i === index ? "active" : "muted";
      });
    }

    function chooseRandomPanel() {
      let previous = -1;

      try {
        const stored = sessionStorage.getItem(
          "p22-last-color-panel"
        );

        if (stored !== null) {
          previous = Number(stored);
        }
      } catch {
        // Random selection still works without storage.
      }

      const candidates = panels
        .map((_, index) => index)
        .filter((index) => index !== previous);

      const selected = candidates[
        Math.floor(Math.random() * candidates.length)
      ];

      try {
        sessionStorage.setItem(
          "p22-last-color-panel",
          String(selected)
        );
      } catch {
        // Ignore unavailable storage.
      }

      return selected;
    }

    function activate() {
      if (scheduled) return;

      // Wait for the Point22 intro/Stretch overlay.
      if (document.querySelector(".p22-intro")) return;

      scheduled = true;
      observer.disconnect();

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Briefly show every image in its original colour.
      timer = window.setTimeout(() => {
        defaultIndex = chooseRandomPanel();
        enabled = true;

        const hoveredIndex = panels.findIndex(
          (panel) => panel.matches(":hover")
        );

        highlight(
          hoveredIndex >= 0
            ? hoveredIndex
            : defaultIndex
        );

        gallery?.classList.add(
          "p22-color-focus-on"
        );
      }, reducedMotion ? 0 : 1250);
    }

    const observer = new MutationObserver(activate);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    activate();

    const cleanupListeners: Array<() => void> = [];

    panels.forEach((panel, index) => {
      const onEnter = (event: PointerEvent) => {
        if (
          event.pointerType === "mouse" ||
          event.pointerType === "pen"
        ) {
          highlight(index);
        }
      };

      const onLeave = (event: PointerEvent) => {
        if (
          event.pointerType === "mouse" ||
          event.pointerType === "pen"
        ) {
          highlight(defaultIndex);
        }
      };

      // Touch devices can select a coloured panel by tapping.
      const onDown = (event: PointerEvent) => {
        if (event.pointerType === "touch" && enabled) {
          defaultIndex = index;
          highlight(index);
        }
      };

      const onFocusIn = () => {
        highlight(index);
      };

      const onFocusOut = () => {
        highlight(defaultIndex);
      };

      panel.addEventListener("pointerenter", onEnter);
      panel.addEventListener("pointerleave", onLeave);
      panel.addEventListener("pointerdown", onDown);
      panel.addEventListener("focusin", onFocusIn);
      panel.addEventListener("focusout", onFocusOut);

      cleanupListeners.push(() => {
        panel.removeEventListener("pointerenter", onEnter);
        panel.removeEventListener("pointerleave", onLeave);
        panel.removeEventListener("pointerdown", onDown);
        panel.removeEventListener("focusin", onFocusIn);
        panel.removeEventListener("focusout", onFocusOut);
      });
    });

    return () => {
      observer.disconnect();

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }

      cleanupListeners.forEach((cleanup) => cleanup());

      gallery.classList.remove("p22-color-focus-on");

      panels.forEach((panel) => {
        delete panel.dataset.p22Color;
      });
    };
  }, []);

  return null;
}
