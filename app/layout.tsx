import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IfcFlux - Federated IFC + SG Viewer",
  description: "Federated IFC+SG viewer, validator, and editor for CORENET X"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
