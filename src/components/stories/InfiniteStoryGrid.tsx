"use client";

import Image from "next/image";
import gsap from "gsap";
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from "react";

import type { StoryAsset } from "@/data/story-media.generated";

type Props = {
  media: StoryAsset[];
  storyTitle: string;
  onOpen: (index: number, source?: HTMLElement) => void;
};

const AUTO_SPEED = 36;
const CURSOR_X = 24;
const CURSOR_Y = 16;
const DRAG_THRESHOLD = 7;

export default function InfiniteStoryGrid({
  media,
  storyTitle,
  onOpen,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);

  // Fill a complete repeating composition.
  // The large image occupies four grid cells.
  const rows = Math.max(
    4,
    Math.ceil((media.length + 3) / 3)
  );

  const items = useMemo(() => {
    if (!media.length) return [];

    const count = rows * 3 - 3;

    return Array.from({ length: count }, (_, index) => ({
      asset: media[index % media.length],
      sourceIndex: index % media.length,
    }));
  }, [media, rows]);

  useEffect(() => {
    const viewportNode = viewportRef.current;
    const tile = tileRef.current;

    if (!viewportNode || !tile || !media.length) return;

    // Capture the verified DOM element for event handlers.
    // TypeScript now knows viewport cannot be null.
    const viewport: HTMLDivElement = viewportNode;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let tileWidth = 0;
    let tileHeight = 0;
    let resetClickTimer: number | undefined;

    const camera = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      cursorX: 0,
      cursorY: 0,
      targetX: 0,
      targetY: 0,
      directionX: 0,
      directionY: 0,
      distanceLeft: 0,
      lastActivity: performance.now(),
    };

    const drag = {
      active: false,
      pointerId: -1,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      velocityX: 0,
      velocityY: 0,
      moved: false,
    };

    // Wrap the camera into the middle of the repeating world.
    // Identical neighbouring tiles make the wrap invisible.
    function wrap(value: number, size: number) {
      if (size <= 0) return 0;

      return (
        size +
        (((value - size) % size + size) % size)
      );
    }

    function measure() {
      if (!viewport || !tile) return;

      const previousWidth = tileWidth;
      const previousHeight = tileHeight;

      tileWidth = tile.getBoundingClientRect().width;
      tileHeight = tile.getBoundingClientRect().height;

      if (!tileWidth || !tileHeight) return;

      if (!previousWidth || !previousHeight) {
        camera.x =
          tileWidth +
          Math.max(0, tileWidth - viewport.clientWidth) / 2;

        camera.y =
          tileHeight +
          Math.max(0, tileHeight - viewport.clientHeight) / 2;
      } else {
        camera.x =
          tileWidth +
          ((camera.x - previousWidth) / previousWidth) *
            tileWidth;

        camera.y =
          tileHeight +
          ((camera.y - previousHeight) / previousHeight) *
            tileHeight;
      }

      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;
    }

    function chooseDirection() {
      const angle = Math.random() * Math.PI * 2;

      camera.directionX = Math.cos(angle);
      camera.directionY = Math.sin(angle);

      camera.distanceLeft =
        200 +
        Math.random() *
          Math.max(300, Math.min(tileWidth, tileHeight));
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      gsap.killTweensOf(viewport);

      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
      drag.velocityX = 0;
      drag.velocityY = 0;
      drag.moved = false;

      camera.vx = 0;
      camera.vy = 0;
      camera.lastActivity = performance.now();
      camera.distanceLeft = 0;

      suppressClickRef.current = false;
    }

    function onPointerMove(event: PointerEvent) {
      // Cursor movement subtly moves the entire grid.
      if (
        event.pointerType === "mouse" ||
        event.pointerType === "pen"
      ) {
        const rect = viewport.getBoundingClientRect();

        camera.targetX = gsap.utils.clamp(
          -1,
          1,
          ((event.clientX - rect.left) / rect.width - 0.5) * 2
        );

        camera.targetY = gsap.utils.clamp(
          -1,
          1,
          ((event.clientY - rect.top) / rect.height - 0.5) * 2
        );
      }

      if (
        !drag.active ||
        event.pointerId !== drag.pointerId
      ) {
        return;
      }

      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;

      if (
        !drag.moved &&
        Math.hypot(totalX, totalY) > DRAG_THRESHOLD
      ) {
        drag.moved = true;

        try {
          viewport.setPointerCapture(event.pointerId);
        } catch {
          // Drag still works if capture is unavailable.
        }
      }

      if (!drag.moved) return;

      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;

      camera.x = wrap(camera.x - deltaX, tileWidth);
      camera.y = wrap(camera.y - deltaY, tileHeight);

      // Update the connected world during the drag.
      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;

      const dt = Math.max(
        0.016,
        (event.timeStamp - drag.lastTime) / 1000
      );

      drag.velocityX =
        drag.velocityX * 0.55 -
        (deltaX / dt) * 0.45;

      drag.velocityY =
        drag.velocityY * 0.55 -
        (deltaY / dt) * 0.45;

      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;

      camera.lastActivity = performance.now();
    }

    function onPointerUp(event: PointerEvent) {
      if (
        !drag.active ||
        event.pointerId !== drag.pointerId
      ) {
        return;
      }

      drag.active = false;

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      const recentlyMoved =
        event.timeStamp - drag.lastTime < 90;

      if (drag.moved) {
        suppressClickRef.current = true;

        window.clearTimeout(resetClickTimer);

        resetClickTimer = window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 150);
      }

      camera.vx =
        drag.moved && recentlyMoved && !reducedMotion
          ? gsap.utils.clamp(-1000, 1000, drag.velocityX)
          : 0;

      camera.vy =
        drag.moved && recentlyMoved && !reducedMotion
          ? gsap.utils.clamp(-1000, 1000, drag.velocityY)
          : 0;

      camera.lastActivity = performance.now();
    }

    function onPointerLeave() {
      camera.targetX = 0;
      camera.targetY = 0;
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;

      event.preventDefault();

      const factor =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientHeight
            : 1;

      camera.x = wrap(
        camera.x + event.deltaX * factor,
        tileWidth
      );

      camera.y = wrap(
        camera.y + event.deltaY * factor,
        tileHeight
      );

      camera.vx = 0;
      camera.vy = 0;
      camera.lastActivity = performance.now();
      camera.distanceLeft = 0;
    }

    function onKeyDown(event: KeyboardEvent) {
      const amount = event.shiftKey ? 160 : 80;

      const movement: Record<string, [number, number]> = {
        ArrowLeft: [-amount, 0],
        ArrowRight: [amount, 0],
        ArrowUp: [0, -amount],
        ArrowDown: [0, amount],
      };

      const delta = movement[event.key];
      if (!delta) return;

      event.preventDefault();

      camera.x = wrap(camera.x + delta[0], tileWidth);
      camera.y = wrap(camera.y + delta[1], tileHeight);
      camera.vx = 0;
      camera.vy = 0;
      camera.lastActivity = performance.now();
    }

    function tick() {
      if (
        !tileWidth ||
        !tileHeight ||
        drag.active ||
        document.visibilityState === "hidden" ||
        (
        document.querySelector(".p22-story-lightbox") ||
        document.querySelector("[data-p22-photo-transition]")
      )
      ) {
        return;
      }

      const dt = Math.min(
        0.05,
        gsap.ticker.deltaRatio(60) / 60
      );

      const ease = 1 - Math.exp(-5 * dt);

      camera.cursorX +=
        (camera.targetX - camera.cursorX) * ease;

      camera.cursorY +=
        (camera.targetY - camera.cursorY) * ease;

      if (!reducedMotion) {
        const velocity = Math.hypot(camera.vx, camera.vy);

        if (velocity > 6) {
          // Smooth momentum after dragging.
          camera.x += camera.vx * dt;
          camera.y += camera.vy * dt;

          const friction = Math.exp(-4 * dt);

          camera.vx *= friction;
          camera.vy *= friction;
        } else {
          camera.vx = 0;
          camera.vy = 0;

          // Resume automatic movement after interaction.
          if (
            performance.now() - camera.lastActivity > 850
          ) {
            if (camera.distanceLeft <= 0) {
              chooseDirection();
            }

            const distance = Math.min(
              AUTO_SPEED * dt,
              camera.distanceLeft
            );

            camera.x += camera.directionX * distance;
            camera.y += camera.directionY * distance;
            camera.distanceLeft -= distance;
          }
        }
      }

      camera.x = wrap(camera.x, tileWidth);
      camera.y = wrap(camera.y, tileHeight);

      // Cursor offset affects the entire connected canvas.
      viewport.scrollLeft = wrap(
        camera.x +
          (reducedMotion ? 0 : camera.cursorX * CURSOR_X),
        tileWidth
      );

      viewport.scrollTop = wrap(
        camera.y +
          (reducedMotion ? 0 : camera.cursorY * CURSOR_Y),
        tileHeight
      );
    }

    measure();

    const resizeObserver = new ResizeObserver(measure);

    resizeObserver.observe(viewport);
    resizeObserver.observe(tile);

    viewport.addEventListener(
      "pointerdown",
      onPointerDown
    );

    viewport.addEventListener(
      "pointermove",
      onPointerMove
    );

    viewport.addEventListener(
      "pointerleave",
      onPointerLeave
    );

    viewport.addEventListener(
      "pointerup",
      onPointerUp
    );

    viewport.addEventListener(
      "pointercancel",
      onPointerUp
    );

    viewport.addEventListener(
      "wheel",
      onWheel,
      { passive: false }
    );

    viewport.addEventListener(
      "keydown",
      onKeyDown
    );

    chooseDirection();
    camera.lastActivity =
      performance.now() - 1000;

    gsap.ticker.add(tick);

    return () => {
      resizeObserver.disconnect();
      gsap.ticker.remove(tick);

      viewport.removeEventListener(
        "pointerdown",
        onPointerDown
      );

      viewport.removeEventListener(
        "pointermove",
        onPointerMove
      );

      viewport.removeEventListener(
        "pointerleave",
        onPointerLeave
      );

      viewport.removeEventListener(
        "pointerup",
        onPointerUp
      );

      viewport.removeEventListener(
        "pointercancel",
        onPointerUp
      );

      viewport.removeEventListener(
        "wheel",
        onWheel
      );

      viewport.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.clearTimeout(resetClickTimer);
      gsap.killTweensOf(viewport);
    };
  }, [media, storyTitle]);

  function preventDragClick(
    event: MouseEvent<HTMLDivElement>
  ) {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    suppressClickRef.current = false;
  }

  if (!media.length) return null;

  return (
    <div
      ref={viewportRef}
      className="p22-infinite-grid-viewport"
      tabIndex={0}
      role="region"
      aria-label={`${storyTitle} infinite photo gallery. Drag or scroll in any direction.`}
      onClickCapture={preventDragClick}
    >
      <div className="p22-infinite-grid-world">
        {Array.from({ length: 9 }, (_, tileIndex) => (
          <div
            key={tileIndex}
            ref={tileIndex === 4 ? tileRef : undefined}
            className="p22-infinite-grid-tile"
            style={
              {
                "--p22-grid-rows": rows,
              } as CSSProperties
            }
          >
            {items.map(({ asset, sourceIndex }, index) => (
              <button
                key={`${tileIndex}-${index}`}
                type="button"
                tabIndex={tileIndex === 4 ? 0 : -1}
                className={`p22-infinite-grid-card ${
                  index === 0 ? "is-featured" : ""
                }`}
                aria-label={`Open photograph from ${storyTitle}`}
                onClick={(event) => onOpen(sourceIndex, event.currentTarget)}
              >
                {asset.type === "image" ? (
                  <Image
                    src={asset.src}
                    alt={`Photography from ${storyTitle}`}
                    fill
                    sizes="(max-width: 720px) 75vw, 45vw"
                    draggable={false}
                    loading="lazy"
                  />
                ) : (
                  <>
                    <video
                      src={asset.src}
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                    />
                    <span className="p22-grid-video-label">
                      PLAY
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
