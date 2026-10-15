"use client";

import { useEffect, useRef } from "react";

export default function GalleryCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const stage = cursor?.parentElement;

    if (!cursor || !stage) return;

    const label = cursor.querySelector<HTMLElement>(
      ".p22-gallery-cursor-label"
    );

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let visible = false;
    let pressing = false;

    function setMode(mode: "drag" | "view") {
      if (!cursor) return;

      if (cursor.dataset.mode === mode) return;

      cursor.dataset.mode = mode;

      if (label) {
        label.textContent =
          mode === "view" ? "VIEW PROJECT" : "DRAG";
      }
    }

    function animate() {
      if (!cursor || !visible) {
        frame = 0;
        return;
      }

      // Smooth cursor follow, independently
      // from the photograph scrolling animation.
      x += (targetX - x) * 0.23;
      y += (targetY - y) * 0.23;

      cursor.style.transform =
        `translate3d(${x}px, ${y}px, 0) ` +
        "translate(-50%, -50%)";

      frame = requestAnimationFrame(animate);
    }

    function onMove(event: PointerEvent) {
      if (
        !finePointer.matches ||
        event.pointerType === "touch" ||
        !cursor
      ) {
        return;
      }

      const rect = stage!.getBoundingClientRect();

      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;

      if (!visible) {
        visible = true;
        x = targetX;
        y = targetY;

        cursor.dataset.visible = "true";

        if (!frame) {
          frame = requestAnimationFrame(animate);
        }
      }

      const target = event.target;

      const overActiveImage =
        target instanceof Element &&
        Boolean(
          target.closest(
            ".p22-carousel-photo.is-active"
          )
        );

      setMode(
        overActiveImage && !pressing
          ? "view"
          : "drag"
      );
    }

    function onDown(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      pressing = true;
      setMode("drag");
      cursor?.setAttribute("data-pressing", "true");
    }

    function onUp(event: PointerEvent) {
      if (event.pointerType === "touch") return;

      pressing = false;
      cursor?.removeAttribute("data-pressing");
      onMove(event);
    }

    function onLeave() {
      visible = false;
      pressing = false;

      cursor?.removeAttribute("data-pressing");

      if (cursor) {
        cursor.dataset.visible = "false";
      }

      cancelAnimationFrame(frame);
      frame = 0;
    }

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onLeave);
    stage.addEventListener("pointerleave", onLeave);

    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onLeave);
      stage.removeEventListener("pointerleave", onLeave);

      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="p22-gallery-cursor"
      data-mode="drag"
      data-visible="false"
      aria-hidden="true"
    >
      <span className="p22-gallery-cursor-corner p22-gallery-cursor-tl" />
      <span className="p22-gallery-cursor-corner p22-gallery-cursor-tr" />
      <span className="p22-gallery-cursor-corner p22-gallery-cursor-bl" />
      <span className="p22-gallery-cursor-corner p22-gallery-cursor-br" />

      <span className="p22-gallery-cursor-label">
        DRAG
      </span>
    </div>
  );
}
