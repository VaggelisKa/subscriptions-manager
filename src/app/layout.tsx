import { cn } from "@/lib/utils";
import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/providers/ThemeProvider";

const font = Nunito({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Subscriptions manager",
  description: "Register and track your subscriptions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={cn(font.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <main className="px-6 py-12 md:mx-auto md:max-w-4xl">{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
