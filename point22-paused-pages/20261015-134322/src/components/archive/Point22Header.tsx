"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePageTransition } from "@/components/transitions/PageTransitionProvider";

import "@/styles/archive.css";

const pages = [
  { label: "THE VIEW", href: "/" },
  { label: "TIMELINE", href: "/timeline" },
  { label: "ABOUT", href: "/information" },
];

export default function Point22Header() {
  const pathname = usePathname();
  const { navigateToTimeline } = usePageTransition();

  const isTimeline = pathname === "/timeline";

  return (
    <header
      className={
        "p22-reference-header p22-topbar p22-site-header" +
        (isTimeline ? " p22-site-header--timeline" : "")
      }
    >
      <div className="p22-topbar-brand">
        <Link
          href="/"
          className="p22-topbar-logo"
          aria-label="Point22 home"
        >
          POINT22<sup>®</sup>
        </Link>

        <span
          className="p22-topbar-divider"
          aria-hidden="true"
        />

        <p className="p22-topbar-statement">
          THROUGH MY EYES.
          <span>NO FIXED FRAME.</span>
        </p>
      </div>

      <nav
        className="p22-topbar-nav"
        aria-label="Primary navigation"
      >
        {pages.map((page) => {
          const active =
            pathname === page.href ||
            (page.href === "/timeline" &&
              pathname.startsWith("/timeline/"));

          return (
            <Link
              key={page.href}
              href={page.href}
              onClick={(event) => {
                // Return from a project through the
                // photographic contact-sheet portal.
                if (
                  page.href === "/timeline" &&
                  pathname.startsWith("/timeline/") &&
                  !event.defaultPrevented &&
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey
                ) {
                  event.preventDefault();

                  window.dispatchEvent(
                    new Event("point22:project-return")
                  );

                  return;
                }

                // Animate only Homepage -> Timeline.
                // Preserve normal modified-click behaviour.
                if (
                  page.href !== "/timeline" ||
                  pathname !== "/" ||
                  event.defaultPrevented ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }

                event.preventDefault();
                navigateToTimeline();
              }}
              className={
                "p22-topbar-link" +
                (active ? " is-current" : "")
              }
              aria-current={active ? "page" : undefined}
            >
              {page.label}
            </Link>
          );
        })}
      </nav>

      <div className="p22-topbar-right">
        <Link
          href="/contact"
          className="p22-topbar-contact"
          aria-current={
            pathname === "/contact" ? "page" : undefined
          }
        >
          CONNECT
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  );
}
