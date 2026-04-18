import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PomoDoto — Focus. Earn. Play.",
    template: "%s · PomoDoto",
  },
  description: "Gamified Pomodoro timer that rewards your focus sessions with Dota 2 game credits. Complete 2 Pomodoros to earn one game.",
  keywords: ["pomodoro", "dota 2", "productivity", "focus timer", "gamification"],
  authors: [{ name: "PomoDoto" }],
  openGraph: {
    title: "PomoDoto — Focus. Earn. Play.",
    description: "Turn your focus sessions into Dota game credits. 2 Pomodoros = 1 game earned.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "PomoDoto",
    description: "Focus hard. Earn games. Stay consistent.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PomoDoto",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
