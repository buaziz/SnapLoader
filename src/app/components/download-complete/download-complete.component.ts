import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-download-complete',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="text-center flex flex-col items-center justify-center p-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-24 h-24 text-snap-yellow mx-auto mb-4">
        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
      </svg>
      
      <h2 class="text-3xl font-bold text-white mb-2">{{ 'COMPLETE_TITLE' | translate }}</h2>
      <p class="text-zinc-400 mb-8" [innerHTML]="'COMPLETE_SUBTITLE' | translate:{filename: zipFilename()}"></p>
      
      <button (click)="download.emit()" 
              class="w-full max-w-md bg-snap-yellow hover:bg-opacity-90 text-black font-bold py-5 px-12 text-2xl rounded-full shadow-lg transition-transform duration-200 hover:scale-105 mb-12">
        {{ 'COMPLETE_DOWNLOAD_BUTTON' | translate }}
      </button>
      
      <button (click)="startOver.emit()" class="bg-snap-dark hover:bg-black/50 text-white font-semibold py-2 px-6 rounded-full transition-colors duration-200">
        {{ 'COMPLETE_START_OVER_BUTTON' | translate }}
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadCompleteComponent {
  zipFilename = input.required<string>();
  
  download = output<void>();
  startOver = output<void>();
}
