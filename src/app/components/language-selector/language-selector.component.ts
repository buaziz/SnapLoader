import { ChangeDetectionStrategy, Component, computed, inject, signal, ElementRef } from '@angular/core';
import { TranslateService } from '../../services/translate.service';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    'class': 'relative inline-block text-left'
  },
})
export class LanguageSelectorComponent {
  translateService = inject(TranslateService);
  private elementRef = inject(ElementRef);

  isOpen = signal(false);

  currentLanguageName = computed(() => {
    const currentCode = this.translateService.currentLang();
    const lang = this.translateService.availableLanguages().find(l => l.code === currentCode);
    return lang ? lang.name : 'Language';
  });

  toggleDropdown(): void {
    this.isOpen.update(open => !open);
  }

  selectLanguage(langCode: string): void {
    if (this.translateService.currentLang() !== langCode) {
      this.translateService.use(langCode);
    }
    this.isOpen.set(false);
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}