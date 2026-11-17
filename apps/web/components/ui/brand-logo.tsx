import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND_ASSETS, BRAND_ALT, BRAND_NAME } from "@/lib/brand";

export interface BrandLogoProps {
  variant?: "full" | "mark" | "transparent";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
  linkToHome?: boolean;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SIZE_CONFIGS = {
  xs: { height: 24, width: 53, markSize: 24, text: "text-[15px]" },
  sm: { height: 32, width: 70, markSize: 32, text: "text-[17px]" },
  md: { height: 38, width: 84, markSize: 38, text: "text-[19px]" },
  lg: { height: 48, width: 106, markSize: 48, text: "text-[22px]" },
  xl: { height: 60, width: 132, markSize: 60, text: "text-[26px]" },
};

/**
 * BrandLogo — Centralized, consistent NES Mastery logo component.
 * Respects official brand asset dimensions and aspect ratio (2.2:1 for full logo, 1:1 for mark).
 */
export function BrandLogo({
  variant = "full",
  size = "md",
  className,
  imageClassName,
  priority = false,
  showText = false,
  textClassName,
  subtitle,
  linkToHome = false,
  href = "/",
  onClick,
}: BrandLogoProps) {
  const config = SIZE_CONFIGS[size];

  const src =
    variant === "transparent"
      ? BRAND_ASSETS.logoTransparent
      : variant === "mark"
      ? BRAND_ASSETS.logoSquare
      : BRAND_ASSETS.logo;

  const isMark = variant === "mark";
  const renderWidth = isMark ? config.markSize : config.width;
  const renderHeight = isMark ? config.markSize : config.height;

  const logoNode = (
    <div className={cn("inline-flex items-center gap-2.5 shrink-0 group select-none", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[8px] bg-white border border-slate-200/70 dark:border-white/10 shadow-xs flex items-center justify-center p-1 transition-transform duration-200 group-hover:scale-[1.03]",
          isMark && "aspect-square"
        )}
        style={{
          height: `${renderHeight}px`,
          width: isMark ? `${renderHeight}px` : `${renderWidth}px`,
        }}
      >
        <Image
          src={src}
          alt={BRAND_ALT}
          width={464}
          height={isMark ? 464 : 211}
          priority={priority}
          className={cn("w-full h-full object-contain", imageClassName)}
        />
      </div>

      {(showText || subtitle) && (
        <div className="flex flex-col leading-none">
          {showText && (
            <span
              className={cn(
                "font-[800] tracking-tight text-slate-900 dark:text-white flex items-center",
                config.text,
                textClassName
              )}
            >
              NES <span className="text-[#2563EB] dark:text-[#60A5FA] ml-1">Mastery</span>
            </span>
          )}
          {subtitle && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex items-center w-fit">
        {logoNode}
      </Link>
    );
  }

  return logoNode;
}
