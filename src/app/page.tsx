import { Suspense } from "react";
import { HomeClient } from "@/app/home-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeClient />
    </Suspense>
  );
}

