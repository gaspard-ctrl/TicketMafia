import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TicketMafia",
  description: "Coachello internal ticketing — synced with Slack",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
