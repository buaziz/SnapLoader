import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Language {
  code: string;
  name: string;
  dir: 'ltr' | 'rtl';
}

const AVAILABLE_LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ar', name: 'عربي', dir: 'rtl' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
  { code: 'bn', name: 'বাংলা', dir: 'ltr' },
];

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private http = inject(HttpClient);

  private translations = signal<Record<string, string>>({});
  currentLang = signal('en'); // Default language

  // FIX: Added a `ready` computed signal that becomes true once translations are loaded.
  // This resolves the `translateService.ready is not a function` error.
  ready = computed(() => Object.keys(this.translations()).length > 0);

  direction = computed<'ltr' | 'rtl'>(() => {
    const lang = AVAILABLE_LANGUAGES.find(l => l.code === this.currentLang());
    return lang?.dir ?? 'ltr';
  });

  availableLanguages = signal(AVAILABLE_LANGUAGES);

  initialize(initialLang: string): void {
    this.use(initialLang);
  }

  async use(langCode: string): Promise<void> {
    // Basic fallback if language not in list (though list is source of truth for UI)
    const isAvailable = AVAILABLE_LANGUAGES.some(l => l.code === langCode);
    if (!isAvailable) {
      console.warn(`[TranslateService] Language '${langCode}' not enabled. Falling back to 'en'.`);
      langCode = 'en';
    }

    try {
      const data = await firstValueFrom(this.http.get<Record<string, string>>(`i18n/${langCode}.json`));
      this.translations.set(data);
      this.currentLang.set(langCode);
    } catch (error) {
      console.error(`[TranslateService] Failed to load language '${langCode}'.`, error);
      // Fallback to english if not already trying english
      if (langCode !== 'en') {
        this.use('en');
      }
    }
  }

  get(key: string, params?: Record<string, string | number>): string {
    // Use `?? key` to provide a fallback to the key itself if the translation is missing.
    const translation = this.translations()[key] ?? key;
    if (params) {
      return this._interpolate(translation, params);
    }
    return translation;
  }

  private _interpolate(text: string, params: Record<string, string | number>): string {
    let interpolated = text;
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      interpolated = interpolated.replace(regex, String(value));
    }
    return interpolated;
  }
}