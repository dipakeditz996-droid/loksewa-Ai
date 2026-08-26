import { useState, useEffect } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const saved = localStorage.getItem("loksewa_theme") as "light" | "dark" | "system" | null;
    if (saved) {
      setTheme(saved);
    }
  }, []);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("loksewa_theme", newTheme);

    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (newTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }
  };

  const options: { id: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light Mode", icon: Sun },
    { id: "dark", label: "Dark Mode", icon: Moon },
    { id: "system", label: "System Default", icon: Monitor },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#E7EBF3] pb-5">
        <h3 className="text-lg font-semibold text-[#101828]">Appearance</h3>
        <p className="text-sm text-[#667085]">
          Customize how the Teacher Portal looks on this device.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => handleThemeChange(opt.id)}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 p-6 transition-all",
                isActive
                  ? "border-[#0B2545] bg-[#EEF2F8] text-[#0B2545]"
                  : "border-[#E7EBF3] bg-[#F7F9FC] text-[#667085] hover:border-[#D9E1EA]"
              )}
            >
              <Icon className="mb-3 h-8 w-8" />
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[#EEF1F6] bg-[#F7F9FC] p-4 text-sm text-[#667085]">
        <p>Your appearance settings are saved locally in this browser.</p>
      </div>
    </div>
  );
}
