import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SoloOS — The Financial Operating System for Independent Professionals" },
      {
        name: "description",
        content:
          "SoloOS helps freelancers, consultants, and solo businesses know what they earned, what they keep, and what to do next. An authoritative financial command center.",
      },
      {
        name: "keywords",
        content:
          "solo finance, freelance accounting, financial operating system, cashflow forecasting, tax reserve calculator, invoice tracker, independent professional finance, profit margin tracker, client profitability",
      },
      { name: "author", content: "SoloOS" },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
      { name: "color-scheme", content: "dark light" },
      { name: "theme-color", content: "#09090b", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "application-name", content: "SoloOS" },
      { name: "apple-mobile-web-app-title", content: "SoloOS" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },

      // Open Graph / Facebook
      { property: "og:site_name", content: "SoloOS" },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "SoloOS — The Financial Operating System for Independent Professionals",
      },
      {
        property: "og:description",
        content:
          "Know what you earned. Know what you keep. Know what to do next. Invoicing, expenses, cashflow runway, and tax reserves in one calm financial command center.",
      },
      { property: "og:url", content: "https://solo-finance-command.vercel.app" },
      { property: "og:image", content: "https://solo-finance-command.vercel.app/og-image.svg" },
      { property: "og:image:type", content: "image/svg+xml" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "SoloOS Financial Command Center Dashboard Preview",
      },
      { property: "og:locale", content: "en_US" },

      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "SoloOS — The Financial Operating System for Independent Professionals",
      },
      {
        name: "twitter:description",
        content:
          "Know what you earned. Know what you keep. Know what to do next. Financial command center built for people who run their own business.",
      },
      { name: "twitter:image", content: "https://solo-finance-command.vercel.app/og-image.svg" },
      {
        name: "twitter:image:alt",
        content: "SoloOS Financial Command Center",
      },
    ],
    links: [
      { rel: "canonical", href: "https://solo-finance-command.vercel.app/" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,400&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "SoloOS",
          alternateName: "Solo Finance Command",
          url: "https://solo-finance-command.vercel.app",
          description:
            "SoloOS is the financial operating system for freelancers, consultants, and solo businesses to track earnings, invoices, tax reserves, cash runway, and profitability.",
          applicationCategory: "BusinessApplication, FinanceApplication",
          operatingSystem: "All Modern Browsers",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          featureList: [
            "Authoritative Transactional Ledger",
            "Multi-Currency Invoicing & Payment Tracking",
            "Tax Reserve Planning & Allocation Calculation",
            "Cashflow Forecasting & Safe-to-Spend Runway",
            "Client and Project Profitability Analytics",
            "Multi-Tenant PostgreSQL Row-Level Security",
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
