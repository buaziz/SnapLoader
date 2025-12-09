import { Injectable, inject } from '@angular/core';
import { SnapParserService, ParseResult } from './snap-parser.service';
import { GeocodingService } from './geocoding.service';
import { StateService, SelectionMode } from './state.service';
import { DownloadService } from './download.service';
import { Memory, Batch } from '../models';
import { TranslateService } from './translate.service';
import { LocalStorageService } from './local-storage.service';

import { saveAs } from 'file-saver';
import JSZip from 'jszip';

@Injectable({ providedIn: 'root' })
export class AppService {
  // Service Injections
  private stateService = inject(StateService);
  private downloadService = inject(DownloadService);
  private snapParser = inject(SnapParserService);
  private geocodingService = inject(GeocodingService);
  private translateService = inject(TranslateService);
  private localStorageService = inject(LocalStorageService);

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
          htmlContent = await zip.file(historyFilePath)!.async('string');
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

      // Initialize local storage and load history for this dataset
      await this.localStorageService.init(memories);
      this.stateService.loadHistory(memories);

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

    if (this.stateService.isLargeSelection()) {
      this.downloadService.prepareBatches(memoriesToProcess);
      this.stateService.status.set('batchControl');
    } else {
      this.downloadService.startDownload(memoriesToProcess);
    }
  }

  async processBatch(batch: Batch): Promise<void> {
    await this.downloadService.processBatch(batch);
  }

  async processAllBatches(): Promise<void> {
    const plannedBatches = this.stateService.batches().filter(b => b.status === 'planned');
    for (const batch of plannedBatches) {
      if (this.stateService.isCancelled()) break;
      await this.downloadService.processBatch(batch);
    }
  }

  downloadProcessedBatch(batch: Batch): void {
    if (batch.zipBlobUrl && batch.status === 'success') {
      saveAs(batch.zipBlobUrl, batch.zipFilename);
    }
  }

  async downloadAllSuccessfulBatches(): Promise<void> {
    const successfulBatches = this.stateService.batches().filter(b => b.status === 'success' && b.zipBlobUrl);
    for (const batch of successfulBatches) {
      this.downloadProcessedBatch(batch);
      // Add a small delay between downloads to prevent the browser from blocking popups
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  setSelectionMode(mode: SelectionMode): void {
    this.stateService.setSelectionMode(mode);
  }

  selectItem(item: number | string): void {
    // Reset any active drill-down view first
    this.stateService.monthSelectionActive.set(false);
    this.stateService.yearSelectionForCountryActive.set(false);
    this.stateService.selectItem(item);

    const selectionMode = this.stateService.selectionMode();
    const allMems = this.stateService.memories();
    const memoriesForSelection = allMems.filter(m =>
      (selectionMode === 'year' && m.date.getFullYear() === item) ||
      (selectionMode === 'country' && m.country === item)
    );

    // Only drill down for large selections
    if (memoriesForSelection.length > this.stateService.getLargeSelectionThreshold()) {
      if (selectionMode === 'year') {
        this.stateService.activateMonthSelection(item as number);
      } else if (selectionMode === 'country') {
        this.stateService.activateYearSelectionForCountry(item as string);
      }
    }
  }

  backToYearView(): void {
    this.stateService.monthSelectionActive.set(false);
    this.stateService.selectedMonths.set(new Set());
  }

  toggleMonth(month: number): void {
    this.stateService.toggleMonth(month);
  }

  backToCountryView(): void {
    this.stateService.yearSelectionForCountryActive.set(false);
    this.stateService.selectedYearsForCountry.set(new Set());
  }

  toggleYearForCountry(year: number): void {
    this.stateService.toggleYearForCountry(year);
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
    // Also clear any loaded history when doing a full reset
    this.localStorageService.clearSession();
  }

  private handleError(messageKey: string): void {
    const translatedMessage = this.translateService.get(messageKey);
    this.stateService.errorMessage.set(translatedMessage);
    this.stateService.status.set('error');
  }
}
