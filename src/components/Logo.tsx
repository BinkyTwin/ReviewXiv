"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 32, height = 32 }: LogoProps) {
  return (
    <>
      <Image
        src="/logo_theme_blanc.png"
        alt="ReviewXiv Logo"
        width={width}
        height={height}
        className={cn("object-contain block dark:hidden", className)}
        priority
      />
      <Image
        src="/logo_theme_noir.png"
        alt="ReviewXiv Logo"
        width={width}
        height={height}
        className={cn("object-contain hidden dark:block", className)}
        priority
      />
    </>
  );
}
