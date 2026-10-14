# Point22® — Visual Archive

An independent creative identity and archive of photography, fashion, clothing,
films, and everyday moments, created with Next.js App Router and TypeScript.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Key locations

- `src/app/page.tsx`: entry to the archive, with the foundation visual shell.
- `src/app/information/page.tsx`: editorial information page.
- `src/app/contact/page.tsx`: contact page scaffold (real contact details not added).
- `src/app/work/[slug]/page.tsx`: typed dynamic project route.
- `src/data/projects.ts`: central project list (starts empty intentionally).
- `src/types/project.ts`: typed image/video and project models.
- `src/components/navigation/SiteHeader.tsx`: desktop and mobile navigation.
- `src/providers/SmoothScrollProvider.tsx`: Lenis and GSAP integration.
- `src/app/globals.css`: global visual design system.
- `public/images/` and `public/videos/`: real, approved media by category.

The typography-only gallery stage is temporary. The interactive slider, grid,
list, optional fisheye shader and entry/loading experience will be implemented
when we design those sections. No stock media or fabricated portfolio work is included.

## Dependencies

Next.js, React, TypeScript, Tailwind CSS, GSAP, ScrollTrigger, @gsap/react,
Lenis, Motion, Lucide, Three.js, React Three Fiber and Drei.

Three.js is installed but not imported into the main page or JavaScript bundle
until advanced effects are built.
