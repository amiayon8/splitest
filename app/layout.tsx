import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./material-symbols.css";
import "./globals.css";
import { SplitestProvider } from "@/lib/store";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Splitest | Collaborative Wallet & Expense Hub",
  description:
    "Shared ledger and debt resolution platform with real-time sync powered by Supabase.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/Splitest.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const preference = localStorage.getItem('splitest_theme_preference');
                const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (preference === 'dark' || ((!preference || preference === 'system') && systemDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8FAFC] dark:bg-[#090D16] text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-150">
        <SplitestProvider>{children}</SplitestProvider>
      </body>
    </html>
  );
}
