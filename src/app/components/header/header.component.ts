import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LanguageSelectorComponent, TranslatePipe],
  template: `
    <header class="text-center flex flex-col items-center">
      <h1 class="text-3xl sm:text-5xl font-bold text-white mb-2 uppercase tracking-wider leading-tight flex items-center justify-center gap-3 break-all">
        <span class="text-4xl sm:text-6xl">👻</span>
        <span>
            <span>{{ 'HEADER_TITLE_PART_1' | translate }}</span>
            <span class="text-snap-yellow">{{ 'HEADER_TITLE_PART_2' | translate }}</span>
        </span>
      </h1>
      <p class="text-lg text-zinc-500 uppercase tracking-wide">{{ 'HEADER_SUBTITLE' | translate }}</p>
      
      @if (stateService.status() === 'idle') {
        <div class="mt-6">
          <app-language-selector></app-language-selector>
        </div>
      }
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  stateService = inject(StateService);
}