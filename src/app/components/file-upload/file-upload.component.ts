import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="text-center">
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
  fileSelected = output<File>();

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}