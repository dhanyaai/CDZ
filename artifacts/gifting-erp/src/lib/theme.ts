import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const KEY = "cd-theme";

function readStored(): Theme {
  if (typeof localStorage !== "undefined") {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") return t;
  }
  return "light";
}

let current: Theme = readStored();
const listeners = new Set<() => void>();

export function getStoredTheme(): Theme {
  return current;
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function setTheme(theme: Theme): void {
  current = theme;
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, theme);
  applyTheme(theme);
  listeners.forEach((l) => l());
}

export function toggleTheme(): void {
  setTheme(current === "dark" ? "light" : "dark");
}

export function initTheme(): void {
  applyTheme(current);
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
  return { theme, toggle: toggleTheme };
}
