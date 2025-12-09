import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [LanguageSelectorComponent, TranslatePipe],
  template: `
    <header class="relative text-center flex flex-col items-center">
      @if (stateService.devMode) {
        <div class="absolute top-0 right-0 bg-snap-yellow text-black text-xs font-bold px-3 py-1.5 rounded-bl-lg shadow-lg flex items-center gap-1.5 z-20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v.516c.42.083.82.203 1.2.368a.75.75 0 0 1 .454 1.082l-.462.85A5.003 5.003 0 0 1 12.5 8c0 .762-.17 1.49-.49 2.134l.461.85a.75.75 0 0 1-1.082.454 6.47 6.47 0 0 1-1.2.368v.516A.75.75 0 0 1 8 14a.75.75 0 0 1-.75-.75v-.516a6.47 6.47 0 0 1-1.2-.368.75.75 0 0 1-.454-1.082l.462-.85A5.003 5.003 0 0 1 3.5 8c0-.762.17-1.49.49-2.134l-.461-.85a.75.75 0 0 1 1.082-.454c.38.165.78.285 1.2.368V2.75A.75.75 0 0 1 8 2ZM4.269 6.28a.75.75 0 0 1 1.132-.974 4.97 4.97 0 0 1 1.163.633.75.75 0 1 1-.974 1.132 3.47 3.47 0 0 0-.81-.454.75.75 0 0 1-.511-.337Zm7.462 2.45a.75.75 0 0 1 .337.511 3.47 3.47 0 0 0 .454.81l-.884.478a.75.75 0 1 1-.722-1.336l.815-.463ZM10.57 5.306a.75.75 0 1 1 .974 1.132 3.47 3.47 0 0 0-.81.454.75.75 0 0 1-1.132-.974 4.97 4.97 0 0 1 1.163.633l-.195-.345ZM5.43 10.694a.75.75 0 1 1 .974-1.132 3.47 3.47 0 0 0 .81-.454.75.75 0 0 1 .511.337l-.345.195a4.97 4.97 0 0 1-1.163-.633.75.75 0 0 1-.974 1.132l.187.355Z" clip-rule="evenodd" />
          </svg>
          <span>DEV MODE</span>
        </div>
      }
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
