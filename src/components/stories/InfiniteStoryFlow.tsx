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

const CLUSTER_WIDTH = 1710;
const TILE_HEIGHT = 1280;

const AUTO_SPEED = 38;
const CURSOR_X = 22;
const CURSOR_Y = 14;
const DRAG_THRESHOLD = 7;

// Irregular editorial positioning, intentionally
// different from the structured Grid view.
const positions = [
  { x: 100, y: 60, w: 330, h: 460, r: -2 },
  { x: 525, y: 200, w: 290, h: 380, r: 1 },
  { x: 925, y: 40, w: 340, h: 430, r: -1 },
  { x: 1330, y: 230, w: 270, h: 360, r: 2 },
  { x: 160, y: 680, w: 320, h: 380, r: 1 },
  { x: 560, y: 765, w: 310, h: 360, r: -2 },
  { x: 985, y: 680, w: 295, h: 400, r: 2 },
  { x: 1340, y: 800, w: 260, h: 330, r: -1 },
];

export default function InfiniteStoryFlow({
  media,
  storyTitle,
  onOpen,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);

  const clusters = Math.max(
    1,
    Math.ceil(media.length / positions.length)
  );

  const items = useMemo(() => {
    if (!media.length) return [];

    return Array.from(
      { length: clusters * positions.length },
      (_, index) => {
        const slot = positions[index % positions.length];
        const cluster = Math.floor(
          index / positions.length
        );

        return {
          asset: media[index % media.length],
          sourceIndex: index % media.length,
          cluster,
          slot,
        };
      }
    );
  }, [media, clusters]);

  useEffect(() => {
    const viewportNode = viewportRef.current;
    const tileNode = tileRef.current;

    if (!viewportNode || !tileNode || !media.length) {
      return;
    }

    const viewport: HTMLDivElement = viewportNode;
    const tile: HTMLDivElement = tileNode;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let tileWidth = 0;
    let tileHeight = 0;
    let initialized = false;
    let clickTimer: number | undefined;

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

    // The middle of three repeated tiles is our safe zone.
    // Wrapping the position produces no visible jump because
    // the neighbouring compositions are identical.
    function wrap(value: number, size: number) {
      if (size <= 0) return 0;

      return (
        size +
        (((value - size) % size + size) % size)
      );
    }

    function measure() {
      const width = tile.getBoundingClientRect().width;
      const height = tile.getBoundingClientRect().height;

      if (!width || !height) return;

      if (!initialized) {
        tileWidth = width;
        tileHeight = height;

        camera.x = width + 200;
        camera.y = height + 230;

        initialized = true;
      } else if (
        width !== tileWidth ||
        height !== tileHeight
      ) {
        camera.x =
          width +
          ((camera.x - tileWidth) / tileWidth) * width;

        camera.y =
          height +
          ((camera.y - tileHeight) / tileHeight) * height;

        tileWidth = width;
        tileHeight = height;
      }

      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;
    }

    function chooseDirection() {
      const angle = Math.random() * Math.PI * 2;

      camera.directionX = Math.cos(angle);
      camera.directionY = Math.sin(angle);

      camera.distanceLeft =
        350 + Math.random() * 950;
    }

    function onDown(event: PointerEvent) {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

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

      // Adopt the exact visible camera position so
      // dragging begins without a cursor-parallax jump.
      camera.x = viewport.scrollLeft;
      camera.y = viewport.scrollTop;

      camera.cursorX = 0;
      camera.cursorY = 0;
      camera.targetX = 0;
      camera.targetY = 0;

      camera.vx = 0;
      camera.vy = 0;
      camera.distanceLeft = 0;
      camera.lastActivity = performance.now();

      suppressClickRef.current = false;
    }

    function onMove(event: PointerEvent) {
      if (
        event.pointerType === "mouse" ||
        event.pointerType === "pen"
      ) {
        const rect = viewport.getBoundingClientRect();

        camera.targetX = gsap.utils.clamp(
          -1,
          1,
          ((event.clientX - rect.left) /
            rect.width - 0.5) * 2
        );

        camera.targetY = gsap.utils.clamp(
          -1,
          1,
          ((event.clientY - rect.top) /
            rect.height - 0.5) * 2
        );
      }

      if (
        !drag.active ||
        drag.pointerId !== event.pointerId
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
        suppressClickRef.current = true;

        try {
          viewport.setPointerCapture(event.pointerId);
        } catch {
          // Continue if capture isn't available.
        }
      }

      if (!drag.moved) return;

      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;

      camera.x = wrap(camera.x - dx, tileWidth);
      camera.y = wrap(camera.y - dy, tileHeight);

      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;

      const dt = Math.max(
        0.016,
        (event.timeStamp - drag.lastTime) / 1000
      );

      drag.velocityX =
        drag.velocityX * 0.55 -
        (dx / dt) * 0.45;

      drag.velocityY =
        drag.velocityY * 0.55 -
        (dy / dt) * 0.45;

      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;

      camera.lastActivity = performance.now();
    }

    function onUp(event: PointerEvent) {
      if (
        !drag.active ||
        drag.pointerId !== event.pointerId
      ) {
        return;
      }

      drag.active = false;

      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }

      if (drag.moved) {
        window.clearTimeout(clickTimer);

        clickTimer = window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 220);
      }

      const recentMovement =
        event.timeStamp - drag.lastTime < 90;

      camera.vx =
        drag.moved && recentMovement && !reducedMotion
          ? gsap.utils.clamp(
              -950,
              950,
              drag.velocityX
            )
          : 0;

      camera.vy =
        drag.moved && recentMovement && !reducedMotion
          ? gsap.utils.clamp(
              -950,
              950,
              drag.velocityY
            )
          : 0;

      camera.lastActivity = performance.now();
    }

    function onLeave() {
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

      // Two-finger trackpad movement follows both axes.
      // A standard wheel explores vertically.
      camera.x = wrap(
        camera.x + event.deltaX * factor,
        tileWidth
      );

      camera.y = wrap(
        camera.y + event.deltaY * factor,
        tileHeight
      );

      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;

      camera.vx = 0;
      camera.vy = 0;
      camera.distanceLeft = 0;
      camera.lastActivity = performance.now();
    }

    function onKeyDown(event: KeyboardEvent) {
      const step = event.shiftKey ? 180 : 85;

      const movements: Record<
        string,
        [number, number]
      > = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };

      const movement = movements[event.key];
      if (!movement) return;

      event.preventDefault();

      camera.x = wrap(
        camera.x + movement[0],
        tileWidth
      );

      camera.y = wrap(
        camera.y + movement[1],
        tileHeight
      );

      viewport.scrollLeft = camera.x;
      viewport.scrollTop = camera.y;

      camera.vx = 0;
      camera.vy = 0;
      camera.lastActivity = performance.now();
    }

    function tick() {
      if (
        !initialized ||
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
        const velocity = Math.hypot(
          camera.vx,
          camera.vy
        );

        if (velocity > 6) {
          camera.x += camera.vx * dt;
          camera.y += camera.vy * dt;

          const friction = Math.exp(-4.2 * dt);

          camera.vx *= friction;
          camera.vy *= friction;
        } else {
          camera.vx = 0;
          camera.vy = 0;

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

            camera.x +=
              camera.directionX * distance;

            camera.y +=
              camera.directionY * distance;

            camera.distanceLeft -= distance;
          }
        }
      }

      camera.x = wrap(camera.x, tileWidth);
      camera.y = wrap(camera.y, tileHeight);

      viewport.scrollLeft = wrap(
        camera.x +
          (reducedMotion
            ? 0
            : camera.cursorX * CURSOR_X),
        tileWidth
      );

      viewport.scrollTop = wrap(
        camera.y +
          (reducedMotion
            ? 0
            : camera.cursorY * CURSOR_Y),
        tileHeight
      );
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(tile);

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("pointerleave", onLeave);

    viewport.addEventListener("wheel", onWheel, {
      passive: false,
    });

    viewport.addEventListener("keydown", onKeyDown);

    chooseDirection();

    camera.lastActivity =
      performance.now() - 1000;

    gsap.ticker.add(tick);

    return () => {
      observer.disconnect();
      gsap.ticker.remove(tick);

      viewport.removeEventListener(
        "pointerdown",
        onDown
      );

      viewport.removeEventListener(
        "pointermove",
        onMove
      );

      viewport.removeEventListener(
        "pointerup",
        onUp
      );

      viewport.removeEventListener(
        "pointercancel",
        onUp
      );

      viewport.removeEventListener(
        "pointerleave",
        onLeave
      );

      viewport.removeEventListener(
        "wheel",
        onWheel
      );

      viewport.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.clearTimeout(clickTimer);
    };
  }, [media, storyTitle]);

  function handleClickCapture(
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
      className="p22-story-flow-viewport p22-infinite-flow-viewport"
      tabIndex={0}
      role="region"
      aria-label={`${storyTitle} infinite photographic flow`}
      onClickCapture={handleClickCapture}
      style={
        {
          "--p22-flow-tile-width": `max(${
            CLUSTER_WIDTH * clusters
          }px, calc(100vw + 320px))`,
          "--p22-flow-tile-height": `${TILE_HEIGHT}px`,
        } as CSSProperties
      }
    >
      <div className="p22-infinite-flow-world">
        {Array.from({ length: 9 }, (_, tileIndex) => (
          <div
            key={tileIndex}
            ref={tileIndex === 4 ? tileRef : undefined}
            className="p22-infinite-flow-tile"
          >
            {items.map((item, index) => {
              const {
                asset,
                sourceIndex,
                cluster,
                slot,
              } = item;

              const leftPercent =
                ((cluster * CLUSTER_WIDTH + slot.x) /
                  (CLUSTER_WIDTH * clusters)) * 100;

              return (
                <button
                  key={`${tileIndex}-${index}`}
                  type="button"
                  tabIndex={tileIndex === 4 ? 0 : -1}
                  className="p22-infinite-flow-card"
                  aria-label={`Open photograph from ${storyTitle}`}
                  style={{
                    left: `${leftPercent}%`,
                    top: `${slot.y}px`,
                    width: `${slot.w}px`,
                    height: `${slot.h}px`,
                    rotate: `${slot.r}deg`,
                  }}
                  onClick={(event) => onOpen(sourceIndex, event.currentTarget)}
                >
                  {asset.type === "image" ? (
                    <Image
                      src={asset.src}
                      alt={`Photography from ${storyTitle}`}
                      fill
                      sizes="(max-width: 720px) 70vw, 360px"
                      draggable={false}
                      loading={
                        tileIndex === 4 && index < 4
                          ? "eager"
                          : "lazy"
                      }
                    />
                  ) : (
                    <>
                      <video
                        src={asset.src}
                        muted
                        playsInline
                        preload="none"
                        aria-hidden="true"
                      />

                      <span className="p22-flow-video-mark">
                        PLAY
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
