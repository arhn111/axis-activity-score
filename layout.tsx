import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Axis Robotics Activity Score",
  description: "Unofficial Axis Robotics activity score checker",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}