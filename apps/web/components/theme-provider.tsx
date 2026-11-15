"use client";

import * as React from "react";

export interface UseThemeProps {
  theme?: string;
  setTheme: (theme: string) => void;
  themes: string[];
  resolvedTheme?: string;
  systemTheme?: "dark" | "light";
  forcedTheme?: string;
}

const ThemeContext = React.createContext<UseThemeProps>({
  theme: "light",
  setTheme: () => {},
  themes: ["light", "dark", "system"],
  resolvedTheme: "light",
  systemTheme: "light",
});

export const useTheme = () => React.useContext(ThemeContext);

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
  forcedTheme?: string;
  themes?: string[];
  value?: Record<string, string>;
  nonce?: string;
}

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = true,
  storageKey = "theme",
  forcedTheme,
  themes = ["light", "dark"],
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<string>(defaultTheme);

  const applyTheme = React.useCallback(
    (targetTheme: string) => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      let effective = targetTheme;
      if (effective === "system" && enableSystem) {
        effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }

      setResolvedTheme(effective);

      if (attribute === "class") {
        root.classList.remove("light", "dark");
        root.classList.add(effective);
      } else {
        root.setAttribute(attribute, effective);
      }
    },
    [attribute, enableSystem]
  );

  // Synchronize on mount from localStorage or system
  React.useEffect(() => {
    let initialTheme = defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        initialTheme = stored;
      }
    } catch {}

    const target = forcedTheme || initialTheme;
    setThemeState(target);
    applyTheme(target);
  }, [storageKey, defaultTheme, forcedTheme, applyTheme]);

  // Listen for storage changes across tabs
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, applyTheme]);

  // Listen for system theme changes when enableSystem is true
  React.useEffect(() => {
    if (!enableSystem) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const current = forcedTheme || theme;
      if (current === "system") {
        applyTheme("system");
      }
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [enableSystem, theme, forcedTheme, applyTheme]);

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      applyTheme(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {}
    },
    [storageKey, applyTheme]
  );

  const contextValue = React.useMemo<UseThemeProps>(
    () => ({
      theme: forcedTheme || theme,
      setTheme,
      themes: enableSystem ? [...themes, "system"] : themes,
      resolvedTheme,
      systemTheme: resolvedTheme as "dark" | "light",
      forcedTheme,
    }),
    [forcedTheme, theme, setTheme, themes, enableSystem, resolvedTheme]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}
