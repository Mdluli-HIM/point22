"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type IntroStatus =
  | "checking"
  | "loading"
  | "ready"
  | "error"
  | "done";

export default function EntryExperience() {
  const [status, setStatus] = useState<IntroStatus>("checking");
  const [progress, setProgress] = useState(0);

  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const closingRef = useRef(false);

  // Show the intro only once per browser tab session.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const visited = sessionStorage.getItem(
          "point22-intro-entered"
        );

        setStatus(visited === "yes" ? "done" : "loading");
      } catch {
        setStatus("loading");
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // Prevent the underlying website from scrolling.
  useEffect(() => {
    if (status === "done") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [status]);

  // Reveal text only when media is ready.
  useEffect(() => {
    if (status !== "ready" && status !== "error") return;

    const elements = [
      identityRef.current,
      descriptionRef.current,
      actionsRef.current,
    ].filter(Boolean);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const startVideo = () => {
      overlayRef.current?.focus({ preventScroll: true });

      if (status === "error" || reducedMotion || closingRef.current) {
        return;
      }

      const playback = videoRef.current?.play();

      playback?.catch(() => {
        // Buttons stay available even if browser autoplay is blocked.
      });
    };

    if (reducedMotion) {
      gsap.set(elements, { opacity: 1, y: 0 });
      startVideo();
      return;
    }

    gsap.set(elements, {
      opacity: 0,
      y: 26,
    });

    const timeline = gsap.timeline({
      onComplete: startVideo,
    });

    timeline
      .to(identityRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.72,
        ease: "power3.out",
      })
      .to(
        descriptionRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
        },
        0.25
      )
      .to(
        actionsRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
        },
        0.48
      );

    return () => {
      timeline.kill();
    };
  }, [status]);

  function updatePlaybackProgress() {
    const video = videoRef.current;

    if (
      !video ||
      !Number.isFinite(video.duration) ||
      video.duration <= 0
    ) {
      return;
    }

    const percentage = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          (video.currentTime / video.duration) * 100
        )
      )
    );

    setProgress(percentage);
  }

  function enter(withSound: boolean) {
    if (closingRef.current) return;

    closingRef.current = true;

    try {
      sessionStorage.setItem("point22-intro-entered", "yes");
      sessionStorage.setItem(
        "point22-sound",
        withSound ? "on" : "off"
      );
    } catch {
      // Continue if browser storage is unavailable.
    }

    document.documentElement.dataset.point22Sound =
      withSound ? "on" : "off";

    window.dispatchEvent(
      new CustomEvent("point22-sound-change", {
        detail: { enabled: withSound },
      })
    );

    videoRef.current?.pause();

    const overlay = overlayRef.current;
    const identity = identityRef.current;
    const description = descriptionRef.current;
    const actions = actionsRef.current;
    const video = videoRef.current;

    const homepage = document.querySelector<HTMLElement>(
      ".home-hero-inner"
    );

    const header = document.querySelector<HTMLElement>(
      ".site-header"
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const finish = () => {
      if (homepage) {
        gsap.set(homepage, {
          clearProps: "transform,opacity,visibility",
        });
      }

      if (header) {
        gsap.set(header, {
          clearProps: "transform,opacity,visibility",
        });
      }

      setStatus("done");

      requestAnimationFrame(() => {
        const main = document.getElementById("main-content");

        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
        }
      });
    };

    if (!overlay || reducedMotion) {
      finish();
      return;
    }

    // Stop any animations still affecting the intro.
    gsap.killTweensOf(
      [
        overlay,
        identity,
        description,
        actions,
        video,
        homepage,
        header,
      ].filter(Boolean)
    );

    overlay.classList.add("p22-intro--exiting");

    // Clear the previous clip-path implementation.
    gsap.set(overlay, {
      clipPath: "none",
      opacity: 1,
      yPercent: 0,
      force3D: true,
    });

    // Prepare the homepage beneath the intro.
    if (homepage) {
      gsap.set(homepage, {
        y: 65,
        opacity: 0.5,
      });
    }

    const timeline = gsap.timeline({
      defaults: {
        overwrite: "auto",
      },
      onComplete: finish,
    });

    // STEP 1: Remove supporting information.
    if (actions) {
      timeline.to(
        actions,
        {
          opacity: 0,
          y: 20,
          duration: 0.24,
          ease: "power2.in",
        },
        0
      );
    }

    if (description) {
      timeline.to(
        description,
        {
          opacity: 0,
          y: -18,
          duration: 0.32,
          ease: "power2.in",
        },
        0.03
      );
    }

    // STEP 2: Stretch the POINT22 identity.
    if (identity) {
      timeline.to(
        identity,
        {
          scaleX: 1.32,
          scaleY: 0.9,
          opacity: 0.08,
          filter: "blur(7px)",
          duration: 0.7,
          ease: "power3.inOut",
        },
        0.05
      );
    }

    // STEP 3: Push the video toward the viewer.
    if (video) {
      timeline.to(
        video,
        {
          scale: 1.2,
          filter: "brightness(0.55) blur(4px)",
          duration: 1.1,
          ease: "power3.inOut",
        },
        0.03
      );
    }

    // Hide the loading indicator.
    const loader = overlay.querySelector(
      ".p22-intro-bottom"
    );

    if (loader) {
      timeline.to(
        loader,
        {
          opacity: 0,
          y: 12,
          duration: 0.32,
        },
        0.03
      );
    }

    // STEP 4: Slide the entire intro away.
    // Unlike clip-path, the video and its frame
    // remain together during this movement.
    timeline.to(
      overlay,
      {
        yPercent: -105,
        duration: 1.14,
        ease: "expo.inOut",
        force3D: true,
      },
      0.37
    );

    // STEP 5: Reveal the homepage underneath.
    if (homepage) {
      timeline.to(
        homepage,
        {
          y: 0,
          opacity: 1,
          duration: 1.1,
          ease: "power3.out",
        },
        0.47
      );
    }

    if (header) {
      timeline.fromTo(
        header,
        {
          y: -20,
          opacity: 0.6,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
        },
        0.55
      );
    }
  }

  if (status === "done") return null;

  const ready = status === "ready" || status === "error";

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      className="p22-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Enter Point22"
    >
      {status !== "checking" && (
        <div className="p22-intro-media" aria-hidden="true">
          <video
            ref={videoRef}
            className="p22-intro-video"
            src="/videos/intro/point22-intro.mp4"
            preload="auto"
            muted
            playsInline
            loop={false}
            onLoadedData={() => {
              setStatus((current) =>
                current === "loading" ? "ready" : current
              );
            }}
            onCanPlay={() => {
              setStatus((current) =>
                current === "loading" ? "ready" : current
              );
            }}
            onTimeUpdate={updatePlaybackProgress}
            onError={() => {
              setStatus((current) =>
                current === "loading" ? "error" : current
              );
            }}
            onEnded={(event) => {
              // Preserve the video's final frame.
              event.currentTarget.pause();
              setProgress(100);
            }}
          />
        </div>
      )}

      <div className="p22-intro-shade" />

      {ready && (
        <div className="p22-intro-content">
          <div ref={identityRef} className="p22-intro-identity">
            POINT22<span className="p22-intro-registered">®</span>
          </div>

          <p
            ref={descriptionRef}
            className="p22-intro-description"
          >
            A WORLD THROUGH MY EYES.
            <span>
              PHOTOGRAPHY, FASHION, FILMS & EVERYTHING IN BETWEEN.
            </span>
          </p>

          <div ref={actionsRef} className="p22-intro-actions">
            <button
              ref={firstButtonRef}
              className="p22-intro-enter-quiet"
              type="button"
              onClick={() => enter(false)}
            >
              Stretch
            </button>
          </div>
        </div>
      )}

      <div className="p22-intro-bottom">
        <div className="p22-pixel-panel">
          <div
            className="p22-pixel-track"
            role="progressbar"
            aria-label="Intro video progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            {Array.from({ length: 18 }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`p22-pixel-block ${
                  index < Math.round((progress / 100) * 18)
                    ? "is-filled"
                    : ""
                }`}
                style={{
                  transitionDelay: `${index * 25}ms`,
                }}
              />
            ))}
          </div>

          <p className="p22-pixel-status" aria-live="polite">
            {status === "error"
              ? "MEDIA UNAVAILABLE"
              : progress >= 100
                ? "READY"
                : "LOADING"}
          </p>
        </div>
      </div>
    </div>
  );
}
