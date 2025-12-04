import { Injectable, inject } from '@angular/core';
import { SnapParserService, ParseResult } from './snap-parser.service';
import { GeocodingService } from './geocoding.service';
import { StateService, SelectionMode } from './state.service';
import { DownloadService } from './download.service';
import { Memory } from '../models';
import { TranslateService } from './translate.service';

declare var saveAs: any;
declare var JSZip: any;

@Injectable({ providedIn: 'root' })
export class AppService {
  // Service Injections
  private stateService = inject(StateService);
  private downloadService = inject(DownloadService);
  private snapParser = inject(SnapParserService);
  private geocodingService = inject(GeocodingService);
  private translateService = inject(TranslateService);

  // Public Methods (Actions) - Delegating to other services
  async onFileSelected(file: File): Promise<void> {
    if (!file) return;
    try {
      this.stateService.status.set('parsing');
      this.stateService.progressMessageKey.set('PARSING_MESSAGE');
      
      let htmlContent: string | null = null;

      if (file.name.endsWith('.html') || file.type === 'text/html') {
        htmlContent = await file.text();
      } else if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        this.stateService.progressMessageKey.set('UNZIPPING_FILE');
        const zip = await JSZip.loadAsync(file);
        const historyFilePath = Object.keys(zip.files).find(name => name.endsWith('memories_history.html'));
        
        if (historyFilePath) {
          htmlContent = await zip.file(historyFilePath).async('string');
        } else {
          this.handleError('ERROR_NO_HTML_IN_ZIP');
          return;
        }
      } else {
        this.handleError('ERROR_INVALID_FILE_TYPE');
        return;
      }
      
      this.stateService.progressMessageKey.set('PARSING_MESSAGE');

      if (!htmlContent) {
        this.handleError('ERROR_INVALID_FILE');
        return;
      }

      const { memories, expiresAt }: ParseResult = await this.snapParser.parse(htmlContent);
      this.stateService.linksExpireAt.set(expiresAt);

      if (memories.length === 0) {
        this.handleError('ERROR_NO_MEMORIES_FOUND');
        return;
      }
      
      this.stateService.status.set('geocoding');
      this.stateService.progressMessageKey.set('GEOCODING_MESSAGE');
      this.stateService.progress.set(0);
      this.stateService.memories.set(memories);
      this.stateService.isCancelled.set(false);
      
      await this.geocodingService.geocodeMemories(
        this.stateService.memories(),
        (update) => {
            this.stateService.progress.set(update.progress);
            if (update.memoryId) {
                this.stateService.updateMemory(update.memoryId, { country: update.country });
            }
        }
      );

      if (this.stateService.isCancelled()) {
        this.stateService.reset();
        return;
      }

      this.stateService.selection.set(null);
      this.stateService.status.set('summary');
    } catch (err) {
      this.handleError('ERROR_INVALID_FILE');
      console.error(err);
    }
  }

  startDownloadProcess(): void {
    const memoriesToProcess = this.stateService.selectedMemories();
    if (memoriesToProcess.length === 0) return;
    this.downloadService.startDownload(memoriesToProcess);
  }

  setSelectionMode(mode: SelectionMode): void {
    this.stateService.setSelectionMode(mode);
  }

  selectItem(item: number | string): void {
    this.stateService.selectItem(item);
  }
  
  downloadZip(): void {
    if (this.stateService.zipBlobUrl()) {
        saveAs(this.stateService.zipBlobUrl(), this.stateService.zipFilename());
    }
  }

  cancelGeocoding(): void {
    this.stateService.isCancelled.set(true);
    this.stateService.progressMessageKey.set('CANCELLING_GEOCODING');
  }

  cancelDownload(): void {
    this.stateService.isCancelled.set(true);
    this.stateService.progressMessageKey.set('CANCELLING_DOWNLOAD');
  }

  resetForNewDownload(): void {
    this.stateService.resetForNewDownload();
  }

  reset(): void {
    this.stateService.reset();
  }

  private handleError(messageKey: string): void {
    const translatedMessage = this.translateService.get(messageKey);
    this.stateService.errorMessage.set(translatedMessage);
    this.stateService.status.set('error');
  }
}