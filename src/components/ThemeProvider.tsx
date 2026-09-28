"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

const subscribeToTheme = (onChange: () => void) => {
  document.addEventListener("examrank-theme-change", onChange);
  return () => document.removeEventListener("examrank-theme-change", onChange);
};

const getThemeSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const getServerThemeSnapshot = (): Theme => "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    const savedTheme = localStorage.getItem("examrank-theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = initialTheme;
    document.dispatchEvent(new Event("examrank-theme-change"));
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("examrank-theme", nextTheme);
    document.dispatchEvent(new Event("examrank-theme-change"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}