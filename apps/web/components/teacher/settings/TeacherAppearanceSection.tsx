"use client";

import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function TeacherAppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      icon: Sun,
      description: "Clean and bright interface.",
      preview: "bg-white border-slate-200 text-slate-800",
    },
    {
      id: "dark",
      name: "Dark Mode",
      icon: Moon,
      description: "Easier on the eyes in low light.",
      preview: "bg-slate-900 border-slate-800 text-slate-100",
    },
    {
      id: "system",
      name: "System Default",
      icon: Monitor,
      description: "Automatically matches your device.",
      preview: "bg-gradient-to-br from-white to-slate-900 border-slate-300",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-[#0B2545]">Appearance</CardTitle>
          <CardDescription>Customize how LoksewaAI looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col text-left group relative outline-none`}
                >
                  <div className={`
                    w-full aspect-[4/3] rounded-xl border-2 mb-3 overflow-hidden flex items-center justify-center transition-all
                    ${isActive ? 'border-[#0B2545] shadow-sm' : 'border-slate-200 group-hover:border-slate-300'}
                    ${t.preview}
                  `}>
                    <Icon className={`w-8 h-8 ${isActive ? (t.id === 'dark' ? 'text-white' : 'text-[#0B2545]') : 'text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity'}`} />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-bold ${isActive ? 'text-[#0B2545]' : 'text-slate-700'}`}>
                      {t.name}
                    </h3>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{t.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
