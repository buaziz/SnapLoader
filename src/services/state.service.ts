import { Injectable, computed, signal, inject } from '@angular/core';
import { Memory, YearSummary, CountrySummary, Batch } from '../models';
import { TranslateService } from './translate.service';

export type AppStatus = 'idle' | 'parsing' | 'geocoding' | 'summary' | 'zipping' | 'done' | 'error' | 'batchControl';
export type SelectionMode = 'year' | 'country';

// --- Developer Mode Configuration ---
// Set to `true` to force a smaller batch size for easy testing.
const DEV_MODE = true;
const DEV_BATCH_SIZE = 10;
// ------------------------------------

// New interfaces for derived state
export interface VisualStatus {
  textKey: string;
  textParams?: Record<string, string | number>;
  colorClass: string;
  bgClass: string;
  progress: number;
  showProgressBar: boolean;
}

export interface MemoryForDisplay extends Memory {
  visualStatus: VisualStatus;
}

@Injectable({ providedIn: 'root' })
export class StateService {
  private translateService = inject(TranslateService);

  // Expose DEV_MODE to components
  readonly devMode = DEV_MODE;

  // Writable State Signals
  status = signal<AppStatus>('idle');
  memories = signal<readonly Memory[]>([]);
  progress = signal(0);
  progressMessageKey = signal('');
  errorMessage = signal('');
  zipBlobUrl = signal('');
  zipFilename = signal('snapchat-memories.zip');
  linksExpireAt = signal<Date | null>(null);
  yearDownloadProgress = signal<ReadonlyMap<number, number>>(new Map());
  yearDownloadSizeProgress = signal<ReadonlyMap<number, number>>(new Map());
  selectionMode = signal<SelectionMode>('year');
  selection = signal<number | string | null>(null);
  isCancelled = signal(false);

  // --- Batch Download State ---
  isBatchDownload = signal(false);
  totalBatches = signal(0);
  currentBatch = signal(0);
  batches = signal<Batch[]>([]);

  // Computed Signals (Derivations of State)
  isLargeSelection = computed(() => this.selectedTotalMemories() > this.getBatchSize());
  
  linkExpirationStatus = computed(() => {
    const expiresAt = this.linksExpireAt();
    if (!expiresAt) {
      return { status: 'unknown' as const, messageKey: '', messageParams: {} };
    }
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const formattedDate = this._formatLocalizedDate(expiresAt);

    if (expiresAt < now) {
      return { status: 'expired' as const, messageKey: 'LINKS_EXPIRED_ON', messageParams: { date: formattedDate } };
    }
    if (expiresAt < twentyFourHoursFromNow) {
      return { status: 'soon' as const, messageKey: 'LINKS_EXPIRE_SOON', messageParams: { date: formattedDate } };
    }
    return { status: 'valid' as const, messageKey: 'LINKS_VALID_UNTIL', messageParams: { date: formattedDate } };
  });

  yearSummary = computed<YearSummary[]>(() => {
    const summary = new Map<number, { images: number; videos: number }>();
    for (const mem of this.memories()) {
      const year = mem.date.getFullYear();
      if (!summary.has(year)) summary.set(year, { images: 0, videos: 0 });
      const yearData = summary.get(year)!;
      if (mem.type === 'Image') yearData.images++;
      else yearData.videos++;
    }
    const progress = this.yearDownloadProgress();
    const sizeProgress = this.yearDownloadSizeProgress();
    return Array.from(summary.entries())
      .map(([year, data]) => ({ 
          year, ...data, total: data.images + data.videos,
          completed: progress.get(year) || 0,
          size: sizeProgress.get(year) || 0
      }))
      .sort((a, b) => b.year - a.year);
  });

  countrySummary = computed<CountrySummary[]>(() => {
    const summary = new Map<string, number>();
    for (const mem of this.memories()) {
        summary.set(mem.country, (summary.get(mem.country) || 0) + 1);
    }
    
    const getStatus = (country: string): 'normal' | 'unidentified' | 'no-data' => {
      if (country === 'NO_LOCATION_DATA') return 'no-data';
      if (country === 'LOCATION_NOT_IDENTIFIED') return 'unidentified';
      if (country === 'API_ERROR') return 'unidentified';
      return 'normal';
    };
    
    const sortOrder: Record<string, number> = { 'no-data': 1, 'unidentified': 2, 'normal': 3 };

    return Array.from(summary.entries())
      .map(([country, total]) => ({ 
          country, 
          total,
          status: getStatus(country)
      }))
      .sort((a, b) => {
          const statusA = sortOrder[a.status];
          const statusB = sortOrder[b.status];
          if (statusA !== statusB) {
              return statusA - statusB;
          }
          return a.country.localeCompare(b.country);
      });
  });

  totalMemories = computed(() => this.memories().length);
  totalPhotos = computed(() => this.memories().filter(m => m.type === 'Image').length);
  totalVideos = computed(() => this.memories().filter(m => m.type === 'Video').length);

  selectedMemories = computed(() => {
    const currentSelection = this.selection();
    if (currentSelection === null) return [];
    
    const mode = this.selectionMode();
    const allMemories = this.memories();

    if (mode === 'year') {
        return allMemories.filter(mem => mem.date.getFullYear() === currentSelection);
    } 
    return allMemories.filter(mem => mem.country === currentSelection);
  });

  selectedMemoryIds = computed(() => new Set(this.selectedMemories().map(m => m.id)));
  
  selectedYearsForProgress = computed(() => {
    const years = new Set<number>();
    for (const mem of this.selectedMemories()) {
        years.add(mem.date.getFullYear());
    }
    return years;
  });

  selectedTotalMemories = computed(() => this.selectedMemories().length);
  selectedTotalPhotos = computed(() => this.selectedMemories().filter(m => m.type === 'Image').length);
  selectedTotalVideos = computed(() => this.selectedMemories().filter(m => m.type === 'Video').length);

  sortedMemoriesForDisplay = computed<MemoryForDisplay[]>(() => {
    if (this.status() !== 'zipping') {
      return [];
    }
    const selectedIds = this.selectedMemoryIds();

    const memoriesToDisplay = this.memories().filter(m =>
        selectedIds.has(m.id) && m.downloadState !== 'success'
    );
    
    const stateOrder: Record<string, number> = { processing: 1, pending: 2, error: 3 };
    
    const sorted = memoriesToDisplay.sort((a, b) => {
      const orderA = stateOrder[a.downloadState ?? 'pending'] || 4;
      const orderB = stateOrder[b.downloadState ?? 'pending'] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return b.date.getTime() - a.date.getTime();
    });

    return sorted.map(memory => ({
        ...memory,
        visualStatus: this._getVisualStatus(memory)
    }));
  });

  geocodingUnknowns = computed(() => this.memories().filter(m => m.country === 'PENDING_GEOCODING').length);

  geocodingResults = computed(() => {
    const summary = new Map<string, number>();
    for (const mem of this.memories()) {
      if (mem.country !== 'PENDING_GEOCODING') {
        summary.set(mem.country, (summary.get(mem.country) || 0) + 1);
      }
    }
    return Array.from(summary.entries())
      .map(([country, total]) => ({ country, total }))
      .sort((a, b) => b.total - a.total);
  });

  downloadProgressSummary = computed(() => {
    const selected = this.selectedMemories();
    if (selected.length === 0) {
      return {
        headlineKey: 'PREPARING_DOWNLOAD',
        headlineParams: {},
        total: 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalPhotos: 0,
        completedPhotos: 0,
        totalVideos: 0,
        completedVideos: 0,
      };
    }

    let completed = 0;
    let failed = 0;
    let completedPhotos = 0;
    let completedVideos = 0;

    for (const mem of selected) {
      if (mem.downloadState === 'success') {
        completed++;
        if (mem.type === 'Image') {
            completedPhotos++;
        } else {
            completedVideos++;
        }
      } else if (mem.downloadState === 'error') {
        failed++;
      }
    }
    
    const total = selected.length;
    const pending = total - completed - failed;

    const selectionValue = this.selection();
    let headlineKey = 'DOWNLOAD_HEADLINE_DEFAULT';
    let headlineParams: { [key: string]: string | number } = {};
    if (selectionValue) {
        if (typeof selectionValue === 'number') { // It's a year
            headlineKey = 'DOWNLOAD_HEADLINE_YEAR';
            headlineParams = { selection: selectionValue };
        } else { // It's a country
            headlineKey = 'DOWNLOAD_HEADLINE_COUNTRY';
            headlineParams = { selection: selectionValue };
        }
    }

    return {
      headlineKey,
      headlineParams,
      total,
      completed,
      pending,
      failed,
      totalPhotos: this.selectedTotalPhotos(),
      completedPhotos,
      totalVideos: this.selectedTotalVideos(),
      completedVideos,
    };
  });

  // State Mutation Methods
  updateMemory(id: string, updates: Partial<Memory>): void {
    this.memories.update(mems => mems.map(m => m.id === id ? { ...m, ...updates } : m));
  }
  
  updateYearProgress(year: number, fileSize: number): void {
    this.yearDownloadProgress.update(p => new Map(p).set(year, (p.get(year) || 0) + 1));
    this.yearDownloadSizeProgress.update(s => new Map(s).set(year, (s.get(year) || 0) + fileSize));
  }
  
  updateBatch(batchNum: number, updates: Partial<Batch>): void {
    this.batches.update(batches => batches.map(b => b.batchNum === batchNum ? { ...b, ...updates } : b));
  }

  setSelectionMode(mode: SelectionMode): void {
    if(this.selectionMode() === mode) return;
    this.selectionMode.set(mode);
    this.selection.set(null);
  }

  selectItem(item: number | string): void {
    this.selection.set(item);
  }

  resetForNewDownload(): void {
    this.status.set('summary');
    this.progress.set(0);
    this.progressMessageKey.set('');
    this.yearDownloadProgress.set(new Map());
    this.yearDownloadSizeProgress.set(new Map());
    this.selection.set(null);
    if (this.zipBlobUrl()) URL.revokeObjectURL(this.zipBlobUrl());
    this.zipBlobUrl.set('');
    this.memories.update(mems => mems.map(m => {
        const { downloadState, downloadProgress, retryCount, ...rest } = m;
        return rest;
    }));
    this.isBatchDownload.set(false);
    this.totalBatches.set(0);
    this.currentBatch.set(0);
    this.batches().forEach(b => { if (b.zipBlobUrl) URL.revokeObjectURL(b.zipBlobUrl) });
    this.batches.set([]);
  }

  reset(): void {
    this.status.set('idle');
    this.memories.set([]);
    this.progress.set(0);
    this.errorMessage.set('');
    this.selection.set(null);
    this.yearDownloadProgress.set(new Map());
    this.yearDownloadSizeProgress.set(new Map());
    this.linksExpireAt.set(null);
    if (this.zipBlobUrl()) URL.revokeObjectURL(this.zipBlobUrl());
    this.zipBlobUrl.set('');
    this.isBatchDownload.set(false);
    this.totalBatches.set(0);
    this.currentBatch.set(0);
    this.batches().forEach(b => { if (b.zipBlobUrl) URL.revokeObjectURL(b.zipBlobUrl) });
    this.batches.set([]);
  }

  getBatchSize(): number {
    if (DEV_MODE) {
      console.warn(`[Snaploader Dev] DEV_MODE is enabled. Using batch size of ${DEV_BATCH_SIZE}.`);
      return DEV_BATCH_SIZE;
    }

    try {
      // This logic remains for potential future use or for other developers,
      // but DEV_MODE provides the most reliable testing method.
      const batchSizeFromWindow = (window as any).SNAPLOADER_BATCH_SIZE;
      if (typeof batchSizeFromWindow === 'number' && batchSizeFromWindow > 0) {
        return batchSizeFromWindow;
      }
      
      const params = new URLSearchParams(window.location.search);
      const sizeFromUrl = params.get('batchSize');
      if (sizeFromUrl) {
        const num = parseInt(sizeFromUrl, 10);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    } catch (e) {
      // Silently fail if URL params are not available (e.g., in some iframe contexts)
    }

    return 500; // Default production value
  }

  private _getVisualStatus(memory: Memory): VisualStatus {
    const MAX_ATTEMPTS = 3;
    switch (memory.downloadState) {
      case 'processing': {
        const progress = memory.downloadProgress ?? 0;
        if (memory.retryCount && memory.retryCount > 0) {
          return { textKey: 'STATUS_RETRYING', textParams: { attempt: memory.retryCount + 1, max: MAX_ATTEMPTS }, colorClass: 'text-orange-400', bgClass: 'bg-orange-400', progress, showProgressBar: true };
        }
        
        let textKey: string;
        if (memory.overlayUrl) {
          if (progress >= 90) { textKey = `STATUS_EMBEDDING`; }
          else if (progress >= 75) { textKey = `STATUS_MERGING`; }
          else if (progress >= 50) { textKey = `STATUS_DOWNLOADING_OVERLAY`; }
          else { textKey = `STATUS_DOWNLOADING`; }
        } else {
          if (progress >= 90) { textKey = `STATUS_EMBEDDING`; }
          else { textKey = `STATUS_DOWNLOADING`; }
        }

        return { textKey, colorClass: 'text-yellow-400', bgClass: 'bg-yellow-400', progress, showProgressBar: true };
      }
      case 'success': return { textKey: 'STATUS_COMPLETED', colorClass: 'text-green-400', bgClass: 'bg-green-500', progress: 100, showProgressBar: true };
      case 'error': return { textKey: 'STATUS_FAILED', colorClass: 'text-red-500', bgClass: 'bg-red-500', progress: 0, showProgressBar: true };
      case 'pending':
      default: return { textKey: 'STATUS_QUEUED', colorClass: 'text-zinc-400', bgClass: 'bg-zinc-700', progress: 0, showProgressBar: true };
    }
  }

  private _formatLocalizedDate(date: Date): string {
    const lang = this.translateService.currentLang();
    const locale = lang === 'ar' ? 'ar-SA' : 'en-GB';

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    };

    if (lang === 'ar') {
      options.calendar = 'gregory';
    }

    try {
      // The 'Intl' object is a standard, modern way to handle localization.
      return new Intl.DateTimeFormat(locale, options).format(date).replace(/ /g, '-');
    } catch (e) {
      console.error("Date formatting with Intl failed, falling back to simple format.", e);
      // Fallback for older browsers or environments where Intl might not be fully supported.
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Simple numeric month
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }
}
