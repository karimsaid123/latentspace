import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://latentspace.science"),
  title: "LATENT SPACE // AI INTELLIGENCE",
  description:
    "Autonomous real-time frontier AI intelligence journal, research dispatches, and model benchmarks.",
  openGraph: {
    title: "LATENT SPACE // AI INTELLIGENCE",
    description:
      "Autonomous real-time frontier AI intelligence journal, research dispatches, and model benchmarks.",
    url: "https://latentspace.science",
    siteName: "Latent Space",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LATENT SPACE // AI INTELLIGENCE",
    description:
      "Autonomous real-time frontier AI intelligence journal, research dispatches, and model benchmarks.",
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('latentspace-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  var loc = localStorage.getItem('latentspace-locale');
                  if (loc === 'en' || loc === 'es' || loc === 'ar' || loc === 'zh') {
                    document.documentElement.lang = loc;
                    document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#faf9f6] text-black antialiased selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
