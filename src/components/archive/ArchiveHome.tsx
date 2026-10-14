"use client";

import ArchiveMotion from "@/components/archive/ArchiveMotion";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import EntryExperience from "@/components/entry/EntryExperience";

type Work = {
  id: string;
  title: string;
  image: string;
  tags: string[];
  description: string;
  location: string;
  year: string;
};

const works: Work[] = [
  {
    id: "01",
    title: "A STUDY\nIN RESILIENCE",
    image: "/images/archive/01-featured.jpg",
    tags: ["PEOPLE", "CULTURE", "RESILIENCE", "A BRIGHTER", "TOMORROW"],
    description:
      "PORTRAITS OF STRENGTH, IDENTITY AND BELONGING AROUND THE WORLD.",
    location: "LONDON, UK",
    year: "2024",
  },
  {
    id: "02",
    title: "COMMUNITY\nYOUTH\nEXPRESSION",
    image: "/images/archive/02-portrait.jpg",
    tags: ["COMMUNITY", "YOUTH", "EXPRESSION"],
    description: "",
    location: "",
    year: "",
  },
  {
    id: "03",
    title: "PORTRAITS\nIDENTITY\nBELONGING",
    image: "/images/archive/03-detail.jpg",
    tags: ["PORTRAITS", "IDENTITY", "BELONGING"],
    description: "",
    location: "",
    year: "",
  },
  {
    id: "04",
    title: "PLACES\nPEOPLE\nMOVEMENT",
    image: "/images/archive/04-street.jpg",
    tags: ["PLACES", "PEOPLE", "MOVEMENT"],
    description: "",
    location: "NEW YORK",
    year: "",
  },
  {
    id: "05",
    title: "TRAVEL\nLANDSCAPE\nTRANSIT\nIN BETWEEN",
    image: "/images/archive/05-motion.jpg",
    tags: ["TRAVEL", "LANDSCAPE", "TRANSIT", "IN BETWEEN"],
    description: "",
    location: "",
    year: "",
  },
];

function WorkImage({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`p22-fallback ${className}`}>
        <span>POINT22®</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      className={className}
      sizes="100vw"
      onError={() => setFailed(true)}
    />
  );
}


const storySlugs = [
  "featured",
  "portrait",
  "detail",
  "street",
  "motion",
] as const;

export default function ArchiveHome() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = works[activeIndex];

  const topRight = works[1];
  const middleRight = works[2];
  const tallRight = works[3];
  const stripBottom = works[4];

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % works.length);
  };

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + works.length) % works.length);
  };

  return (
    <>
      <EntryExperience />

      <main className="p22-reference-home home-hero-inner">
        <ArchiveMotion
          activeIndex={activeIndex}
          onNavigate={(direction) => {
            setActiveIndex((index) =>
              (index + direction + works.length) % works.length
            );
          }}
        />
        <header className="p22-reference-header p22-topbar">
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
            <Link
              href="/"
              className="p22-topbar-link is-current"
              aria-current="page"
            >
              THE VIEW
            </Link>

            <Link
              href="/information"
              className="p22-topbar-link"
            >
              ABOUT
            </Link>
          </nav>

          <div className="p22-topbar-right">

            <Link
              href="/contact"
              className="p22-topbar-contact"
            >
              CONNECT
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>

        <section className="p22-reference-grid">
          <article className="p22-feature-panel">
            <Link
              className="p22-story-cover-link"
              href={`/work/${storySlugs[activeIndex]}`}
              aria-label="Open featured Point22 story"
              onPointerDown={(event) => {
                event.currentTarget.dataset.startX =
                  String(event.clientX);
                event.currentTarget.dataset.dragged = "no";
              }}
              onPointerUp={(event) => {
                const start = Number(
                  event.currentTarget.dataset.startX ??
                  event.clientX
                );

                if (Math.abs(event.clientX - start) > 45) {
                  event.currentTarget.dataset.dragged =
                    "yes";
                }
              }}
              onClick={(event) => {
                if (
                  event.currentTarget.dataset.dragged ===
                  "yes"
                ) {
                  event.preventDefault();
                }
              }}
            />

            <div className="p22-image-wrap">
              <WorkImage
                src={active.image}
                alt={active.title}
                priority
                className="p22-main-image"
              />
              <div className="p22-image-overlay" />
            </div>

            <div className="p22-feature-top-meta">

              <div className="p22-feature-tags">
                {active.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="p22-feature-copy">

              <h1>
                {active.title.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </h1>

              <p className="p22-feature-description">
                {active.description}
              </p>

              <div className="p22-feature-foot">
                <span>{active.location}</span>
                
              </div>

              <Link href={`/work/${storySlugs[activeIndex]}`} className="p22-view-project">
                VIEW PROJECT
                <span>→</span>
              </Link>
            </div>
          </article>

          <article className="p22-side-card p22-side-top">
            <Link
              className="p22-story-cover-link"
              href="/work/portrait"
              aria-label="Open Point22 portrait story"
            />

            <div className="p22-image-wrap">
              <WorkImage
                src={topRight.image}
                alt={topRight.title}
                className="p22-card-image"
              />
              <div className="p22-image-overlay" />
            </div>

            <div className="p22-card-bottom-left">
              {topRight.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="p22-card-bottom-right">STILLS</div>
          </article>

          <article className="p22-side-card p22-side-middle">
            <Link
              className="p22-story-cover-link"
              href="/work/detail"
              aria-label="Open Point22 detail story"
            />

            <div className="p22-image-wrap">
              <WorkImage
                src={middleRight.image}
                alt={middleRight.title}
                className="p22-card-image"
              />
              <div className="p22-image-overlay" />
            </div>

            <div className="p22-card-bottom-left">
              {middleRight.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="p22-card-bottom-right">STILLS</div>
          </article>

          <article className="p22-side-card p22-side-tall">
            <Link
              className="p22-story-cover-link"
              href="/work/street"
              aria-label="Open Point22 street story"
            />

            <div className="p22-image-wrap">
              <WorkImage
                src={tallRight.image}
                alt={tallRight.title}
                className="p22-card-image"
              />
              <div className="p22-image-overlay" />
            </div>

            <div className="p22-card-top-right">
              {tallRight.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="p22-card-bottom-row">
              <span>STILLS</span>
              <span>{tallRight.location}</span>
            </div>
          </article>

          <article className="p22-film-strip">
            <Link
              className="p22-story-cover-link"
              href="/work/motion"
              aria-label="Open Point22 motion story"
            />

            <div className="p22-image-wrap">
              <WorkImage
                src={stripBottom.image}
                alt={stripBottom.title}
                className="p22-strip-image"
              />
              <div className="p22-image-overlay" />
            </div>

            <div className="p22-film-left">

              <div className="p22-film-tags">
                {stripBottom.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="p22-film-play">▶</div>

            <div className="p22-film-right">
              <span>STILLS</span>
            </div>
          </article>
        </section>

        <footer
          className="p22-reference-footer p22-ruler-footer"
          aria-label="Archive navigation"
        >
          <div
            className="p22-ruler-label"
            aria-live="polite"
            aria-atomic="true"
          >
            {String(activeIndex + 1).padStart(2, "0")}
            {" / "}
            {String(works.length).padStart(2, "0")}
          </div>

          <div className="p22-ruler-controls">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
            >
              ←
            </button>

            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
            >
              →
            </button>
          </div>

          <div
            className="p22-ruler-ticks"
            aria-hidden="true"
          />
        </footer>
      </main>
    </>
  );
}
