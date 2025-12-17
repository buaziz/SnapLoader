import { Injectable, inject } from '@angular/core';
import { Memory, Batch } from '../models';
import { StateService } from './state.service';
import { ZipperService } from './zipper.service';
import { TranslateService } from './translate.service';
import { ReportService } from './report.service';
import { LocalStorageService } from './local-storage.service';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import * as piexif from 'piexifjs';

const CONCURRENCY_LIMIT = 5;

// Memory and file size limits (in bytes)
const MAX_SINGLE_FILE_SIZE = 100 * 1024 * 1024; // 100MB warning threshold
const SOFT_MEMORY_LIMIT = 400 * 1024 * 1024; // 400MB - warn user
const HARD_MEMORY_LIMIT = 600 * 1024 * 1024; // 600MB - strongly recommend stopping
const MAX_IMAGE_DIMENSION = 4096; // Max width/height for canvas operations

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private stateService = inject(StateService);
  private zipper = inject(ZipperService);
  private translateService = inject(TranslateService);
  private reportService = inject(ReportService);
  private localStorageService = inject(LocalStorageService);

  /** Check if streaming ZIP is available (determines if batch mode is needed) */
  isStreamingAvailable(): boolean {
    return this.zipper.supportsStreamingZip();
  }

  async startDownload(memoriesToProcess: readonly Memory[]): Promise<void> {
    this.stateService.isCancelled.set(false);
    this.stateService.status.set('zipping');
    this.stateService.yearDownloadProgress.set(new Map());
    this.stateService.yearDownloadSizeProgress.set(new Map());

    this._setInitialMemoryState(memoriesToProcess);

    this.stateService.isBatchDownload.set(false);
    const singleBatch: Batch = {
      batchNum: 1,
      totalBatches: 1,
      memories: memoriesToProcess,
      status: 'processing',
      zipFilename: this.getZipFilename()
    };

    this.stateService.batches.set([singleBatch]);
    this.stateService.currentBatch.set(1);
    this.stateService.totalBatches.set(1);

    // CRITICAL FIX: Request file handle IMMEDIATELY (during user gesture)
    // before any async operations. This prevents SecurityError.
    let fileHandle: FileSystemFileHandle | null = null;
    if (this.zipper.supportsStreamingZip()) {
      try {
        console.log('🔐 Requesting file save location (must happen during user gesture)...');
        fileHandle = await this.zipper.requestFileHandle(singleBatch.zipFilename);
        console.log('✅ File handle obtained successfully');
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('User cancelled file save');
          this.stateService.reset();
          return;
        }
        console.warn('Failed to get file handle, falling back to traditional mode:', error);
        fileHandle = null; // Fall back to traditional mode
      }
    }

    const wasSuccessful = await this.processAndZipSingleBatch(singleBatch, fileHandle);

    if (this.stateService.isCancelled()) {
      this.stateService.reset();
    } else if (wasSuccessful) {
      this.stateService.status.set('done');
    } else {
      this.stateService.errorMessage.set(this.translateService.get('ERROR_ZIP_CREATION'));
      this.stateService.status.set('error');
    }
  }

  prepareBatches(memoriesToProcess: readonly Memory[]): void {
    this.stateService.isBatchDownload.set(true);
    const batchSize = this.stateService.getLargeSelectionThreshold();
    const totalBatches = Math.ceil(memoriesToProcess.length / batchSize);
    this.stateService.totalBatches.set(totalBatches);

    const batches: Batch[] = [];
    for (let i = 0; i < totalBatches; i++) {
      const batchMemories = memoriesToProcess.slice(i * batchSize, (i + 1) * batchSize);
      batches.push({
        batchNum: i + 1,
        totalBatches: totalBatches,
        memories: batchMemories,
        status: 'planned',
        zipFilename: this.getZipFilename(i + 1, totalBatches)
      });
    }
    this.stateService.batches.set(batches);
  }

  async processBatch(batch: Batch): Promise<void> {
    if (this.stateService.isCancelled()) {
      this.stateService.isCancelled.set(false);
    }

    // Switch to zipping view if not already there
    this.stateService.status.set('zipping');
    this.stateService.currentBatch.set(batch.batchNum);
    this.stateService.updateBatch(batch.batchNum, { status: 'processing', zipBlobUrl: undefined });

    this._setInitialMemoryState(batch.memories);

    await this.processAndZipSingleBatch(batch);

    // After processing, return to the control screen
    this.stateService.status.set('batchControl');
  }

  private async processAndZipSingleBatch(batch: Batch, fileHandle: FileSystemFileHandle | null = null): Promise<boolean> {
    this.stateService.progressMessageKey.set('CREATING_ZIP');
    this.stateService.progress.set(0);
    this.zipper.initializeZip();

    let completed = 0;
    let cumulativeSize = 0; // Track total memory usage
    const total = batch.memories.length;
    const queue = [...batch.memories];

    const processMemory = async (memory: Memory) => {
      this.stateService.updateMemory(memory.id, { downloadState: 'processing', downloadProgress: 0 });
      try {
        this.stateService.updateMemory(memory.id, { downloadProgress: 5 });

        const initialBlob = await this.fetchWithRetry(memory.downloadUrl, memory.isGetRequest, memory.filename, (attempt) => {
          this.stateService.updateMemory(memory.id, { retryCount: attempt, downloadProgress: 0 });
        });

        let mainFileBlob: Blob;
        let overlayBlob: Blob | null = null;

        if (memory.type === 'Image') {
          if (await this._isZipFile(initialBlob)) {
            this.stateService.updateMemory(memory.id, { downloadProgress: 10 });
            const zip = await JSZip.loadAsync(initialBlob);

            const findFile = (predicate: (filename: string) => boolean): string | undefined => {
              return Object.keys(zip.files).find(name => !zip.files[name].dir && predicate(name.toLowerCase()));
            };

            const mainFileName = findFile(name => name.endsWith('-main.jpg') || name.endsWith('-main.jpeg'));

            if (!mainFileName) throw new Error('ZIP archive did not contain a main image file.');

            mainFileBlob = await zip.file(mainFileName)!.async('blob');
            this.stateService.updateMemory(memory.id, { downloadProgress: 30 });

            // --- RESILIENT OVERLAY EXTRACTION ---
            try {
              const overlayFileName = findFile(name => name.endsWith('-overlay.png'));
              if (overlayFileName) {
                overlayBlob = await zip.file(overlayFileName)!.async('blob');
                this.stateService.updateMemory(memory.id, { downloadProgress: 50 });
              }
            } catch (overlayError) {
              console.warn(`Could not extract overlay for ${memory.filename} from ZIP. Proceeding without overlay.`, overlayError);
              overlayBlob = null;
            }

          } else if (initialBlob.type.includes('application/json')) {
            this.stateService.updateMemory(memory.id, { downloadProgress: 10 });
            const manifest = JSON.parse(await initialBlob.text());
            const mediaList = manifest.Media || manifest.media || [];

            const mainMediaEntry = mediaList.find((m: any) => m['Media Type'] === 'PHOTO' || m['Media Type'] === 'VIDEO');

            if (!mainMediaEntry?.URI) throw new Error('JSON manifest does not contain a valid main media URI.');

            this.stateService.updateMemory(memory.id, { downloadProgress: 15 });
            mainFileBlob = await this.fetchWithRetry(mainMediaEntry.URI, true, memory.filename, (attempt) => {
              this.stateService.updateMemory(memory.id, { retryCount: attempt, downloadProgress: 15 });
            });
            this.stateService.updateMemory(memory.id, { downloadProgress: 50 });

            // --- RESILIENT OVERLAY FETCHING ---
            try {
              const overlayMediaEntry = mediaList.find((m: any) => m['Media Type'] === 'PHOTO_OVERLAY');
              if (overlayMediaEntry?.URI) {
                overlayBlob = await this.fetchWithRetry(overlayMediaEntry.URI, true, `${memory.filename} (overlay)`);
              }
            } catch (overlayError) {
              console.warn(`Could not fetch overlay for ${memory.filename} from manifest. Proceeding without overlay.`, overlayError);
              overlayBlob = null;
            }
          } else {
            mainFileBlob = initialBlob;
          }
        } else {
          mainFileBlob = initialBlob;
        }

        this.stateService.updateMemory(memory.id, { downloadProgress: 75 });

        let finalBlob: Blob;
        // --- RESILIENT IMAGE MERGING ---
        if (memory.type === 'Image' && overlayBlob) {
          try {
            finalBlob = await this._mergeImages(mainFileBlob, overlayBlob);
          } catch (mergeError) {
            console.warn(`Could not merge overlay for ${memory.filename}. Proceeding with main image only.`, mergeError);
            finalBlob = mainFileBlob; // Fallback to main image
          }
        } else {
          finalBlob = mainFileBlob;
        }

        this.stateService.updateMemory(memory.id, { downloadProgress: 90 });
        const finalProcessedBlob = await this._embedGpsData(memory, finalBlob);

        // Validate blob before adding to ZIP
        if (!this._validateBlob(finalProcessedBlob, memory.filename)) {
          throw new Error(`Generated blob for ${memory.filename} is invalid or empty`);
        }

        // Track cumulative size and check memory limits dynamically
        cumulativeSize += finalProcessedBlob.size;
        const cumulativeMB = (cumulativeSize / (1024 * 1024)).toFixed(2);

        if (cumulativeSize > HARD_MEMORY_LIMIT) {
          console.warn(`\n⚠️ MEMORY LIMIT REACHED: ${cumulativeMB} MB downloaded`);
          console.warn(`Processed ${completed + 1}/${total} files in this batch.`);
          console.warn(`Consider stopping here and downloading remaining files in a separate batch.`);
          console.warn(`Continuing download... monitor browser performance.\n`);
        } else if (cumulativeSize > SOFT_MEMORY_LIMIT && cumulativeSize <= HARD_MEMORY_LIMIT) {
          console.warn(`⚠️ Approaching memory limit: ${cumulativeMB} MB downloaded (${completed + 1}/${total} files)`);
        }

        this.zipper.addFile(memory, finalProcessedBlob);
        this.stateService.updateMemory(memory.id, { downloadState: 'success', downloadProgress: 100 });
        this.stateService.updateYearProgress(memory.date.getFullYear(), finalProcessedBlob.size);
        this.localStorageService.recordSuccess(memory.id);
      } catch (error) {
        console.error(`Error processing memory ${memory.id}:`, error);
        this.stateService.updateMemory(memory.id, { downloadState: 'error', downloadProgress: 0 });
        this.localStorageService.recordFailure(memory.id);
      } finally {
        completed++;
        const overallProgress = this.stateService.downloadProgressSummary();
        this.stateService.progress.set(Math.round((overallProgress.completed / overallProgress.total) * 100));
      }
    };

    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
      while (queue.length > 0) {
        if (this.stateService.isCancelled()) break;
        const memory = queue.shift();
        if (memory) await processMemory(memory);
      }
    });
    await Promise.allSettled(workers);

    // After processing, update the main history state signal for UI reactivity
    this.stateService.loadHistory(this.stateService.memories());

    if (this.stateService.isCancelled()) return false;

    // Get successful and failed memories FOR THIS BATCH to generate a report.
    const memoryIdsInBatch = new Set(batch.memories.map(m => m.id));
    const allMemories = this.stateService.memories();

    const successfulMemories = allMemories.filter(m =>
      memoryIdsInBatch.has(m.id) && m.downloadState === 'success'
    );
    const failedMemories = allMemories.filter(m =>
      memoryIdsInBatch.has(m.id) && m.downloadState === 'error'
    );
    const successfulCount = successfulMemories.length;

    if (successfulCount === 0) {
      console.warn(`No files were processed successfully in batch ${batch.batchNum}. Skipping ZIP generation.`);
      if (this.stateService.isBatchDownload()) {
        this.stateService.updateBatch(batch.batchNum, { status: 'error' });
      }
      return false; // Indicate batch failure
    }

    try {
      // Only add a report if there were failures.
      if (failedMemories.length > 0) {
        const reportHtml = this.reportService.generateReportHtml(batch, successfulMemories, failedMemories);
        this.zipper.addReportFile(reportHtml);
      }

      this.stateService.progressMessageKey.set('FINALIZING_ZIP');

      // Use streaming if we have a pre-obtained file handle
      // OR if streaming is supported (for batch mode compatibility)
      let success: boolean;

      if (fileHandle) {
        // We already have the file handle (obtained during user gesture)
        console.log('⚡ Streaming ZIP mode enabled - writing to pre-selected file');
        success = await this.zipper.generateZipStreamWithHandle(fileHandle);

        if (!success) {
          console.warn('⚠️ Streaming ZIP failed - falling back to traditional mode');

          // FALLBACK: Try traditional mode instead
          try {
            console.log('📦 Attempting traditional ZIP mode as fallback...');
            const blob = await this.zipper.generateZip();

            if (!blob || blob.size === 0) {
              throw new Error('ZIP file generation resulted in a 0-byte file.');
            }

            console.log(`Successfully created ZIP via fallback: ${batch.zipFilename} (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`);

            // Save using FileSaver instead
            const { saveAs } = await import('file-saver');
            saveAs(blob, batch.zipFilename);

            if (this.stateService.isBatchDownload()) {
              this.stateService.updateBatch(batch.batchNum, { status: 'success', zipBlobUrl: undefined });
            } else {
              this.stateService.zipFilename.set(batch.zipFilename);
              this.stateService.zipBlobUrl.set('');
              this.stateService.streamingUsed.set(false);
            }

            return true;
          } catch (fallbackError) {
            console.error('❌ Fallback to traditional ZIP also failed:', fallbackError);
            if (this.stateService.isBatchDownload()) {
              this.stateService.updateBatch(batch.batchNum, { status: 'error' });
            }
            return false;
          }
        }

        // For streaming, we don't have a blob URL (file saved directly to disk)
        if (this.stateService.isBatchDownload()) {
          this.stateService.updateBatch(batch.batchNum, { status: 'success', zipBlobUrl: undefined });
        } else {
          this.stateService.zipFilename.set(batch.zipFilename);
          this.stateService.zipBlobUrl.set(''); // No blob URL in streaming mode
          this.stateService.streamingUsed.set(true); // File was saved via streaming
        }
      } else {
        // Traditional mode - JSZip fallback (in-memory generation)
        console.log('📦 Traditional ZIP mode - using in-memory generation');
        const blob = await this.zipper.generateZip();

        // Final validation of the ZIP file
        if (!blob || blob.size === 0) {
          throw new Error('ZIP file generation resulted in a 0-byte file. Please try again or use smaller batches.');
        }

        console.log(`Successfully created ZIP: ${batch.zipFilename} (${(blob.size / (1024 * 1024)).toFixed(2)} MB)`);
        const blobUrl = URL.createObjectURL(blob);

        if (this.stateService.isBatchDownload()) {
          this.stateService.updateBatch(batch.batchNum, { status: 'success', zipBlobUrl: blobUrl });
        } else {
          this.stateService.zipFilename.set(batch.zipFilename);
          this.stateService.zipBlobUrl.set(blobUrl);
        }
      }


      return true;
    } catch (err) {
      console.error("Error generating ZIP:", err);
      if (this.stateService.isBatchDownload()) {
        this.stateService.updateBatch(batch.batchNum, { status: 'error' });
      }
      return false;
    }
  }

  private getZipFilename(batchNum?: number, totalBatches?: number): string {
    const selection = this.stateService.selection();
    if (!selection) {
      return this.translateService.get('ZIP_FILENAME_DEFAULT');
    }

    // REVERT: Use the translated name for the filename.
    const translatedSelection = this.translateService.get(String(selection));
    const sanitizedSelection = translatedSelection
      .replace(/[\\/?%*:|"<>]/g, '')
      .replace(/\s+/g, '-');

    const mode = this.stateService.selectionMode();

    if (batchNum && totalBatches) {
      return this.translateService.get('ZIP_FILENAME_PATTERN_BATCH', {
        mode,
        selection: sanitizedSelection,
        current: batchNum,
        total: totalBatches,
      });
    } else {
      return this.translateService.get('ZIP_FILENAME_PATTERN', {
        mode,
        selection: sanitizedSelection
      });
    }
  }

  private _setInitialMemoryState(memoriesToProcess: readonly Memory[]): void {
    this.stateService.memories.update(allMemories => {
      const selectedIds = new Set(memoriesToProcess.map(m => m.id));
      return allMemories.map(m => selectedIds.has(m.id)
        ? { ...m, downloadState: 'pending' as const, downloadProgress: 0, retryCount: 0 }
        : m
      );
    });
  }

  private async _isZipFile(blob: Blob): Promise<boolean> {
    if (blob.size < 4) return false;
    const arr = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    return arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04;
  }

  async fetchWithRetry(url: string, isGetRequest: boolean, filename: string, onRetry?: (attempt: number) => void): Promise<Blob> {
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY = 2000;
    const TIMEOUT_MS = 15000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort('timeout'), TIMEOUT_MS);

      try {
        let response: Response;
        let isPostRequest = false;

        if (isGetRequest) {
          response = await fetch(url, { signal: abortController.signal });
        } else {
          isPostRequest = true;
          const parts = url.split('?');
          const responseBody = await fetch(parts[0], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: parts[1],
            signal: abortController.signal,
          });

          // POST errors should be retried - don't treat as fatal yet
          if (!responseBody.ok) {
            clearTimeout(timeoutId);
            console.warn(`POST request failed with status ${responseBody.status}. Will retry.`);
            throw new Error(`POST request failed: ${responseBody.status}`);
          }

          const downloadUrl = await responseBody.text();
          response = await fetch(downloadUrl, { signal: abortController.signal });
        }

        clearTimeout(timeoutId);

        // FATAL ERRORS: Only skip retries for 403/404 on the actual file download
        // (not on the POST request to get the signed URL)
        if ((response.status === 403 || response.status === 404) && !isPostRequest) {
          console.warn(`⛔ Fatal error downloading ${filename}: ${response.status}. Link may be expired. Skipping retries.`);
          throw new Error(`Fatal Download Error ${response.status}: File not accessible`);
        }

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }

        return await response.blob();

      } catch (error: any) {
        clearTimeout(timeoutId);

        // Only skip retries for fatal DOWNLOAD errors (not POST errors)
        if (error.message && error.message.startsWith('Fatal Download Error')) {
          throw error;
        }

        console.warn(`Attempt ${attempt} to download ${filename} failed.`, error);

        if (attempt >= MAX_ATTEMPTS) {
          throw new Error(`Failed to download ${filename} after ${MAX_ATTEMPTS} attempts: ${error.message}`);
        }

        onRetry?.(attempt);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
    }
    throw new Error(`Exhausted all attempts to download ${filename}.`);
  }

  private async _mergeImages(mainBlob: Blob, overlayBlob: Blob): Promise<Blob> {
    const mainImage = await createImageBitmap(mainBlob);
    const overlayImage = await createImageBitmap(overlayBlob);

    // Validate image dimensions to prevent memory issues
    if (mainImage.width > MAX_IMAGE_DIMENSION || mainImage.height > MAX_IMAGE_DIMENSION) {
      console.warn(`Image dimensions (${mainImage.width}x${mainImage.height}) exceed safe limits. Proceeding with caution.`);
    }

    const canvas = document.createElement('canvas');
    canvas.width = mainImage.width;
    canvas.height = mainImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      mainImage.close();
      overlayImage.close();
      throw new Error('Could not get 2D canvas context');
    }

    ctx.drawImage(mainImage, 0, 0);
    ctx.drawImage(overlayImage, 0, 0, mainImage.width, mainImage.height);

    mainImage.close();
    overlayImage.close();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'));
      }, 'image/jpeg', 0.98);
    });
  }

  private async _isValidImageBlob(blob: Blob): Promise<boolean> {
    if (!blob || blob.size === 0) return false;
    let imageBitmap: ImageBitmap | null = null;
    try {
      imageBitmap = await createImageBitmap(blob);
      return true;
    } catch (e) {
      console.warn('Blob validation failed: it could not be decoded as an image.', { blobType: blob.type, blobSize: blob.size });
      return false;
    } finally {
      imageBitmap?.close(); // Release memory
    }
  }

  private async _embedGpsData(memory: Memory, fileBlob: Blob): Promise<Blob> {
    const { latitude, longitude } = memory.location;

    // Only embed GPS in JPEG images (MP4 GPS embedding not supported client-side)
    if (memory.type !== 'Image' || !latitude || !longitude) {
      return fileBlob;
    }

    const fileType = await this._getImageFileType(fileBlob);

    if (fileType?.mime === 'image/jpeg') {
      try {
        const imageWithExif = await this._embedGpsInImage(fileBlob, latitude, longitude, memory.date);

        // Validate the image after EXIF embedding
        if (await this._isValidImageBlob(imageWithExif)) {
          const originalExtension = memory.filename.split('.').pop()?.toLowerCase() || '';
          if (originalExtension !== 'jpg' && originalExtension !== 'jpeg') {
            console.warn(`Correcting file extension for ${memory.filename} to .jpg`);
            memory.filename = memory.filename.replace(/\.[^/.]+$/, ".jpg");
          }
          return imageWithExif;
        } else {
          console.warn(`EXIF embedding for ${memory.filename} resulted in a corrupt image. Proceeding with original file (no GPS data).`);
          return fileBlob; // Fallback to the original, safe blob
        }

      } catch (error) {
        console.error(`Could not embed EXIF data in ${memory.filename}. Proceeding without metadata.`, error);
        return fileBlob;
      }
    }

    // MP4 and other formats: return unchanged
    return fileBlob;
  }

  /**
   * Validates a blob to ensure it's not empty or corrupted
   */
  private _validateBlob(blob: Blob, filename: string): boolean {
    if (!blob) {
      console.error(`Blob validation failed for ${filename}: blob is null or undefined`);
      return false;
    }

    if (blob.size === 0) {
      console.error(`Blob validation failed for ${filename}: 0 bytes`);
      return false;
    }

    // Warn about very large files
    if (blob.size > MAX_SINGLE_FILE_SIZE) {
      console.warn(`File ${filename} is very large (${(blob.size / (1024 * 1024)).toFixed(2)} MB). This may impact performance.`);
    }

    return true;
  }

  private _embedGpsInImage(imageBlob: Blob, latitude: number, longitude: number, date: Date): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          let exifObj = piexif.load(dataUrl) || { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": null };

          exifObj["Exif"] = exifObj["Exif"] || {};
          exifObj["GPS"] = exifObj["GPS"] || {};

          exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = this._formatExifDate(date);
          exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latitude < 0 ? 'S' : 'N';
          exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = this._degToDms(Math.abs(latitude));
          exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = longitude < 0 ? 'W' : 'E';
          exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = this._degToDms(Math.abs(longitude));

          const exifBytes = piexif.dump(exifObj);
          const newDataUrl = piexif.insert(exifBytes, dataUrl);

          fetch(newDataUrl).then(res => res.blob()).then(resolve).catch(reject);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  }

  private async _getImageFileType(blob: Blob): Promise<{ ext: string; mime: string } | null> {
    if (blob.size < 12) return null;
    const arr = new Uint8Array(await blob.slice(0, 12).arrayBuffer());

    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' };
    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return { ext: 'png', mime: 'image/png' };
    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return { ext: 'png', mime: 'image/png' };
    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) return { ext: 'gif', mime: 'image/gif' };

    // MP4 Signature (ftyp) detection is already handled implicitly below, but usually starts at offset 4
    if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) { // ftyp
      return { ext: 'mp4', mime: 'video/mp4' };
    }

    const textDecoder = new TextDecoder();
    if (textDecoder.decode(arr.slice(4, 8)) === 'ftyp') {
      const brand = textDecoder.decode(arr.slice(8, 12));
      if (['heic', 'heix', 'mif1', 'msf1'].includes(brand)) {
        return { ext: 'heic', mime: 'image/heic' };
      }
    }
    return null;
  }

  private _formatExifDate(date: Date): string {
    const YYYY = date.getUTCFullYear();
    // FIX: Corrected typo from getUTCFullMonth to getUTCMonth
    const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const DD = date.getUTCDate().toString().padStart(2, '0');
    const hh = date.getUTCHours().toString().padStart(2, '0');
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${YYYY}:${MM}:${DD} ${hh}:${mm}:${ss}`;
  }

  private _degToDms(deg: number): [[number, number], [number, number], [number, number]] {
    const d = Math.floor(deg);
    const minFloat = (deg - d) * 60;
    const m = Math.floor(minFloat);
    const secFloat = (minFloat - m) * 60;
    const s = Math.round(secFloat * 100);
    return [[d, 1], [m, 1], [s, 100]];
  }
}