type ThemePreference = 'light' | 'dark' | 'system';

class ThemeStore {
  preference = $state<ThemePreference>('system');
  #mediaQuery: MediaQueryList | null = null;

  get isDark(): boolean {
    if (this.preference === 'system') {
      return this.#mediaQuery?.matches ?? false;
    }
    return this.preference === 'dark';
  }

  get label(): string {
    if (this.preference === 'system') return 'System';
    if (this.preference === 'dark') return 'Mørk';
    return 'Lys';
  }

  get icon(): string {
    if (this.preference === 'system') return '◐';
    if (this.preference === 'dark') return '●';
    return '☀';
  }

  constructor() {
    if (typeof window === 'undefined') return;

    this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const saved = localStorage.getItem('theme') as ThemePreference | null;
    if (saved === 'light' || saved === 'dark') {
      this.preference = saved;
    } else {
      this.preference = 'system';
    }

    this.#mediaQuery.addEventListener('change', () => {
      if (this.preference === 'system') {
        this.#apply();
      }
    });

    this.#apply();
  }

  toggle() {
    if (this.preference === 'light') {
      this.preference = 'dark';
    } else if (this.preference === 'dark') {
      this.preference = 'system';
    } else {
      this.preference = 'light';
    }
    this.#apply();
  }

  #apply() {
    if (typeof document === 'undefined') return;

    const dark = this.isDark;
    document.documentElement.classList.toggle('dark', dark);

    if (this.preference === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', this.preference);
    }
  }
}

export const themeStore = new ThemeStore();
