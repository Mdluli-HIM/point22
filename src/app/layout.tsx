import Link from "next/link";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { SmoothScrollProvider } from "@/providers/SmoothScrollProvider";
import { navigation, site } from "@/data/site";
import "lenis/dist/lenis.css";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "POINT22® — A World Through My Eyes", template: "%s | POINT22®" },
  description: site.description,
  applicationName: "POINT22",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={geist.variable}>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Suspense
          fallback={
            <header className="site-header">
              <Link className="site-logo" href="/">
                POINT<span>22</span><sup>®</sup>
              </Link>

              <nav
                className="desktop-navigation"
                aria-label="Primary navigation"
              >
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </nav>

              <span
                className="mobile-menu-toggle"
                aria-hidden="true"
              >
                Menu
              </span>
            </header>
          }
        >
          <SiteHeader />
        </Suspense>
        <SmoothScrollProvider>
          <main id="main-content">{children}</main>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
