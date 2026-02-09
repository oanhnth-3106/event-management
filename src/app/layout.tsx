import "./globals.css";
import { Navigation } from "@/components/auth/Navigation";

export const metadata = {
  title: "EventHub - Event Management Platform",
  description: "Discover and register for amazing events",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
