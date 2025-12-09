import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '../services/translate.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private translateService = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    let translation = this.translateService.get(key);
    if (params) {
      Object.keys(params).forEach(paramKey => {
        // Using a global replace to handle multiple occurrences of the same placeholder
        const regex = new RegExp(`{{${paramKey}}}`, 'g');
        translation = translation.replace(regex, String(params[paramKey]));
      });
    }
    return translation;
  }
}