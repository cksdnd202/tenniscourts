import type { Metadata } from "next";
import { MapPageContent } from "./MapPageContent";

export const revalidate = 60;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function MapTestPage() {
  return <MapPageContent />;
}
