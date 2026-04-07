const THEME_STORAGE_KEY = 'tradelink_theme_mode';

export type ThemeMode = 'dark' | 'light';

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
}

export function applyDarkModePreference(enabled: boolean) {
  applyThemeMode(enabled ? 'dark' : 'light');
}

export function restoreStoredThemePreference() {
  if (typeof window === 'undefined') {
    return;
  }

  const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedMode === 'dark' || storedMode === 'light') {
    applyThemeMode(storedMode);
  }
}
