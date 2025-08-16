import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)) {
  // Lazy initializer: check localStorage once
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return JSON.parse(item);
      }
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    } catch {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
  });

  // Sync state → localStorage whenever it changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore write errors (e.g. Safari private mode)
    }
  }, [key, value]);

  return [value, setValue] as const;
}
