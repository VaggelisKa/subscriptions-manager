import { cn } from "@/lib/utils";
import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const font = Nunito({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your subscriptions",
  description: "Overview of your subscriptions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={cn(font.className, "px-6 py-12 md:mx-auto md:max-w-4xl ")}
      >
        {children}
      </body>
    </html>
  );
}
