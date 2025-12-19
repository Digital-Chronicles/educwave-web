import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, JetBrains_Mono } from "next/font/google";

// Optimize fonts with Next.js font optimization
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "Educwave | Education Management System",
    template: "%s | Educwave",
  },
  description: "Comprehensive education management system for schools, teachers, students, and parents.",
  keywords: [
    "school management",
    "education software",
    "student portal",
    "teacher management",
    "academic system",
    "school administration",
  ],
  authors: [{ name: "School Portal" }],
  creator: "School Portal",
  publisher: "School Portal",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://school-portal.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://school-portal.app",
    title: "School Portal | Education Management System",
    description: "Comprehensive education management system for schools, teachers, students, and parents.",
    siteName: "School Portal",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "School Portal Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "School Portal | Education Management System",
    description: "Comprehensive education management system for schools, teachers, students, and parents.",
    images: ["/twitter-image.png"],
    creator: "@schoolportal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" },
  ],
  colorScheme: "light dark",
};

// Performance monitoring
if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
  metadata.other = {
    "google-analytics": process.env.NEXT_PUBLIC_ANALYTICS_ID,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://fonts.gstatic.com"
        />
        
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Apple Smart Banner for iOS */}
        <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID" />
        
        {/* Windows Tile */}
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Additional PWA meta tags */}
        <meta name="application-name" content="School Portal" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="School Portal" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`font-sans antialiased bg-gradient-to-br from-gray-50 via-white to-blue-50/30 text-gray-900 selection:bg-blue-100 selection:text-blue-900 min-h-screen`}
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>

        {/* Main content wrapper */}
        <div id="main-content" className="min-h-screen flex flex-col">
          {children}
        </div>

        {/* Google Analytics (if enabled) */}
        {process.env.NEXT_PUBLIC_ANALYTICS_ID && (
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_ANALYTICS_ID}`}
          />
        )}
        {process.env.NEXT_PUBLIC_ANALYTICS_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_ANALYTICS_ID}', {
                  page_path: window.location.pathname,
                  anonymize_ip: true,
                });
              `,
            }}
          />
        )}

        {/* Error boundary script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(event) {
                if (window._sentry) {
                  window._sentry.captureException(event.error);
                }
              });
              window.addEventListener('unhandledrejection', function(event) {
                if (window._sentry) {
                  window._sentry.captureException(event.reason);
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}