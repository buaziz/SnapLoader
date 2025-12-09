import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="text-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-24 h-24 text-red-500 mx-auto mb-4">
        <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
      </svg>
      <h2 class="text-3xl font-bold text-white mb-2">{{ 'ERROR_TITLE' | translate }}</h2>
      <p class="text-red-400 bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-3 mb-8">{{ errorMessage() }}</p>
      <button (click)="retry.emit()" class="bg-snap-yellow hover:bg-opacity-90 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-transform duration-200 hover:scale-105">
        {{ 'ERROR_RETRY_BUTTON' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorDisplayComponent {
  errorMessage = input.required<string>();
  retry = output<void>();
}