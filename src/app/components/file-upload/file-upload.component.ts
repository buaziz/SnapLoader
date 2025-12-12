import { ChangeDetectionStrategy, Component, output, inject, computed } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ZipperService } from '../../services/zipper.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="text-center">
      <!-- Browser Compatibility Warning -->
      @if (!supportsStreaming()) {
        <div class="max-w-2xl mx-auto mb-6 p-4 bg-orange-900/30 border border-orange-500 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div class="text-left flex-1">
              <h3 class="text-orange-300 font-semibold mb-1">{{ 'BROWSER_WARNING_TITLE' | translate }}</h3>
              <p class="text-orange-200 text-sm mb-2">
                {{ 'BROWSER_WARNING_DESC' | translate }}
              </p>
              <p class="text-orange-100 text-xs" [innerHTML]="'BROWSER_WARNING_TIP' | translate">
              </p>
            </div>
          </div>
        </div>
      }

      <div class="border-2 border-dashed border-snap-gray rounded-2xl p-4 sm:p-8 flex flex-col items-center justify-center hover:border-snap-yellow transition-colors duration-300">
        <h2 class="text-xl sm:text-2xl font-semibold text-white mb-2">
          {{ 'FILE_UPLOAD_TITLE' | translate }}
        </h2>
        <p class="text-zinc-400 mb-4 max-w-sm" [innerHTML]="'FILE_UPLOAD_DESCRIPTION' | translate"></p>
        <a href="https://help.snapchat.com/hc/en-us/articles/7012305371156-How-do-I-download-my-data-from-Snapchat" target="_blank" rel="noopener noreferrer" class="text-sm text-snap-yellow hover:underline mb-6">
          {{ 'FILE_UPLOAD_HELP_LINK' | translate }}
        </a>
        <label for="file-upload" class="cursor-pointer bg-snap-yellow hover:bg-opacity-90 text-black font-bold py-3 px-8 rounded-full shadow-lg transition-transform duration-200 hover:scale-105">
          {{ 'FILE_UPLOAD_BUTTON' | translate }}
        </label>
        <input id="file-upload" type="file" class="hidden" (change)="onFileSelected($event)" accept=".html,.zip">
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  private zipperService = inject(ZipperService);
  
  fileSelected = output<File>();
  supportsStreaming = computed(() => this.zipperService.supportsStreamingZip());

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}