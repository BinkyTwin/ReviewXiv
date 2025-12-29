"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ className, width = 32, height = 32 }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ width, height }} className={className} />;
  }

  // resolvedTheme is either 'light' or 'dark'
  // logo_theme_blanc: for light theme (black logo)
  // logo_theme_noir: for dark theme (white logo)
  const isDark = resolvedTheme === "dark";
  const src = isDark ? "/logo_theme_noir.png" : "/logo_theme_blanc.png";

  return (
    <Image
      src={src}
      alt="DeepRead Logo"
      width={width}
      height={height}
      className={`${className} object-contain`}
      priority
    />
  );
}
