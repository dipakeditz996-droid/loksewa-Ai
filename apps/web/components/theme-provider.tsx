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
  theme: "dark",
  setTheme: () => {},
  themes: ["light", "dark", "system"],
  resolvedTheme: "dark",
  systemTheme: "dark",
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
  defaultTheme = "dark",
  enableSystem = false,
  storageKey = "theme",
  forcedTheme,
  themes = ["light", "dark"],
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

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

  React.useEffect(() => {
    const current = forcedTheme || theme;
    applyTheme(current);
  }, [theme, forcedTheme, applyTheme]);

  // Listen for storage changes across tabs
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {}
    },
    [storageKey]
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
