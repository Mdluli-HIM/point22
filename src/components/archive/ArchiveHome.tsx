"use client";

import Point22Header from "@/components/archive/Point22Header";
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
        <Point22Header />

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
          className="p22-reference-footer p22-home-social-footer"
          aria-label="Stretch22 social media"
        >
          <span className="p22-home-social-name">
            Stretch22
          </span>

          <a
            className="p22-home-instagram"
            href="https://www.instagram.com/stretch22_/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit Stretch22 on Instagram"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>
        </footer>
      </main>
    </>
  );
}
