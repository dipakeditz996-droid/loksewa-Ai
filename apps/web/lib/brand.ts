export const BRAND_NAME = "NES Mastery";
export const BRAND_SHORT_NAME = "NES Mastery";
export const BRAND_TAGLINE = "Nepal's Leading Engineering & Public Service Exam Preparation";
export const BRAND_SUBTITLE = "Your Journey. Our Guidance. Your Success.";
export const BRAND_ALT = "NES Mastery";

export const BRAND_ASSETS = {
  logo: "/brand/logo.png",
  logoWebp: "/brand/logo.webp",
  logoTransparent: "/brand/logo-transparent.png",
  logoTransparentWebp: "/brand/logo-transparent.webp",
  logoSquare: "/brand/logo-square.png",
  logoSquareWebp: "/brand/logo-square.webp",
  logoSquareTransparent: "/brand/logo-square-transparent.png",
  favicon: "/favicon.ico",
  appleTouchIcon: "/apple-touch-icon.png",
  ogImage: "/images/og-card.png",
  icon16: "/brand/icon-16.png",
  icon32: "/brand/icon-32.png",
  icon48: "/brand/icon-48.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
} as const;

export type BrandAssetKey = keyof typeof BRAND_ASSETS;
