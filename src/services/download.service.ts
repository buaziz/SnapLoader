import { Injectable, inject } from '@angular/core';
import { Memory } from '../models';
import { StateService } from './state.service';
import { ZipperService } from './zipper.service';
import { TranslateService } from './translate.service';

declare var piexif: any;
declare var JSZip: any;

@Injectable({ providedIn: 'root' })
export class DownloadService {
  private stateService = inject(StateService);
  private zipper = inject(ZipperService);
  private translateService = inject(TranslateService);

  async startDownload(memoriesToProcess: readonly Memory[]): Promise<void> {
    this.stateService.isCancelled.set(false);
    this.setZipFilename();

    this.stateService.memories.update(allMemories => {
        const selectedIds = this.stateService.selectedMemoryIds();
        return allMemories.map(m => selectedIds.has(m.id)
            ? { ...m, downloadState: 'pending' as const, downloadProgress: 0, retryCount: 0 }
            : m
        );
    });
    
    this.stateService.yearDownloadProgress.set(new Map());
    this.stateService.yearDownloadSizeProgress.set(new Map());
    await this.runZipping(memoriesToProcess);
  }

  private async runZipping(memoriesForProcessing: readonly Memory[]): Promise<void> {
    this.stateService.status.set('zipping');
    this.stateService.progressMessageKey.set('CREATING_ZIP');
    this.stateService.progress.set(0);
    this.zipper.initializeZip();
    
    let completed = 0;
    const total = memoriesForProcessing.length;
    const CONCURRENCY_LIMIT = 5;
    const queue = [...memoriesForProcessing];

    const processMemory = async (memory: Memory) => {
      this.stateService.updateMemory(memory.id, { downloadState: 'processing', downloadProgress: 0, retryCount: 0 });
      try {
        this.stateService.updateMemory(memory.id, { downloadProgress: 5 });

        const initialBlob = await this.fetchWithRetry(memory.downloadUrl, memory.isGetRequest, memory.filename, (attempt) => {
            this.stateService.updateMemory(memory.id, { retryCount: attempt, downloadProgress: 0 });
        });

        let mainFileBlob: Blob;
        let overlayBlob: Blob | null = null;
        let finalBlob: Blob;

        // For images, the downloaded file could be a ZIP archive containing multiple files,
        // a JSON manifest pointing to files, or the image itself.
        // For videos, we assume it's always the direct video file.
        if (memory.type === 'Image') {
          // Scenario 1: Check if it's a ZIP file by its magic number, regardless of name/MIME type.
          if (await this._isZipFile(initialBlob)) {
              this.stateService.updateMemory(memory.id, { downloadProgress: 10 });
              const zip = await JSZip.loadAsync(initialBlob);
              
              // Helper to find a file in the zip, ignoring case and directories.
              const findFile = (predicate: (filename: string) => boolean): string | undefined => {
                return Object.keys(zip.files).find(name => {
                  const file = zip.files[name];
                  if (file.dir) return false;
                  return predicate(name.toLowerCase());
                });
              };

              const mainFileName = findFile(name => name.endsWith('-main.jpg') || name.endsWith('-main.jpeg'));
              const overlayFileName = findFile(name => name.endsWith('-overlay.png'));
  
              if (!mainFileName) {
                  throw new Error('ZIP archive did not contain a main image file.');
              }
              
              mainFileBlob = await zip.file(mainFileName).async('blob');
              this.stateService.updateMemory(memory.id, { downloadProgress: 30 });
              
              if (overlayFileName) {
                  overlayBlob = await zip.file(overlayFileName).async('blob');
                  this.stateService.updateMemory(memory.id, { downloadProgress: 50 });
              }
          
          // Scenario 2: If not a ZIP, check if it's a JSON manifest
          } else if (initialBlob.type.includes('application/json')) {
              this.stateService.updateMemory(memory.id, { downloadProgress: 10 });
              const manifestText = await initialBlob.text();
              const manifest = JSON.parse(manifestText);
              const mediaList = manifest.Media || manifest.media || [];
              
              const mainMediaEntry = mediaList.find((m: any) => m['Media Type'] === 'PHOTO' || m['Media Type'] === 'VIDEO');
              const overlayMediaEntry = mediaList.find((m: any) => m['Media Type'] === 'PHOTO_OVERLAY');
  
              if (!mainMediaEntry || !mainMediaEntry.URI) {
                throw new Error('JSON manifest does not contain a valid main media URI.');
              }
  
              this.stateService.updateMemory(memory.id, { downloadProgress: 15 });
              mainFileBlob = await this.fetchWithRetry(mainMediaEntry.URI, true, memory.filename, (attempt) => {
                this.stateService.updateMemory(memory.id, { retryCount: attempt, downloadProgress: 15 });
              });
              this.stateService.updateMemory(memory.id, { downloadProgress: 50 });
  
              if (overlayMediaEntry && overlayMediaEntry.URI) {
                  overlayBlob = await this.fetchWithRetry(overlayMediaEntry.URI, true, `${memory.filename} (overlay)`, (attempt) => {
                      console.warn(`Overlay download for ${memory.filename} failed on attempt ${attempt}`);
                  });
              }
          
          // Scenario 3: Otherwise, it's a direct media file
          } else {
              mainFileBlob = initialBlob;
          }
        } else { // For videos, assume it's a direct media file
            mainFileBlob = initialBlob;
        }

        this.stateService.updateMemory(memory.id, { downloadProgress: overlayBlob ? 75 : 90 });

        if (memory.type === 'Image' && overlayBlob) {
            finalBlob = await this._mergeImages(mainFileBlob, overlayBlob);
        } else {
            finalBlob = mainFileBlob;
        }
        
        this.stateService.updateMemory(memory.id, { downloadProgress: 90 });
        await this._embedGpsData(memory, finalBlob);

        this.stateService.updateMemory(memory.id, { downloadState: 'success', downloadProgress: 100 });
        this.stateService.updateYearProgress(memory.date.getFullYear(), finalBlob.size);
      } catch (error) {
        console.error(`Error processing memory ${memory.id}:`, error);
        this.stateService.updateMemory(memory.id, { downloadState: 'error', downloadProgress: 0 });
      } finally {
        completed++;
        this.stateService.progress.set(Math.round((completed / total) * 100));
      }
    };

    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(async () => {
        while (queue.length > 0) {
            if (this.stateService.isCancelled()) break;
            const memory = queue.shift();
            if (memory) await processMemory(memory);
        }
    });
    await Promise.all(workers);

    if (this.stateService.isCancelled()) {
      this.stateService.reset();
      return;
    }
    
    try {
      this.stateService.progressMessageKey.set('FINALIZING_ZIP');
      const blob = await this.zipper.generateZip();
      this.stateService.zipBlobUrl.set(URL.createObjectURL(blob));
      this.stateService.status.set('done');
    } catch (err) {
      this.stateService.errorMessage.set(this.translateService.get('ERROR_ZIP_CREATION'));
      this.stateService.status.set('error');
      console.error(err);
    }
  }

  private setZipFilename(): void {
    const selection = this.stateService.selection();
    if (selection) {
      const mode = this.stateService.selectionMode();
      const translatedSelection = this.translateService.get(String(selection));
      
      // New: Unicode-aware sanitization.
      // 1. Remove characters that are invalid in filenames.
      // 2. Replace whitespace with a dash.
      const sanitizedSelection = translatedSelection
          .replace(/[\\/?%*:|"<>]/g, '') // Remove invalid filename characters
          .replace(/\s+/g, '-')          // Replace spaces with a single dash
          .toLowerCase();

      const filename = this.translateService.get('ZIP_FILENAME_PATTERN', {
        mode,
        selection: sanitizedSelection
      });
      this.stateService.zipFilename.set(filename);
    } else {
      this.stateService.zipFilename.set(this.translateService.get('ZIP_FILENAME_DEFAULT'));
    }
  }
  
  private async _isZipFile(blob: Blob): Promise<boolean> {
    if (blob.size < 4) {
      return false;
    }
    const arr = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    // The magic number for a ZIP file is PK\x03\x04
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
        
        if (isGetRequest) {
          response = await fetch(url, {
            signal: abortController.signal,
          });
        } else {
          const parts = url.split('?');
          const responseBody = await fetch(parts[0], {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: parts[1],
            signal: abortController.signal,
          });
          const downloadUrl = await responseBody.text();
          response = await fetch(downloadUrl, { signal: abortController.signal });
        }
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
        
        return await response.blob();

      } catch (error) {
        clearTimeout(timeoutId);
        console.warn(`Attempt ${attempt} to download ${filename} failed.`, error);
        
        if (attempt >= MAX_ATTEMPTS) {
          throw new Error(`Failed to download ${filename} after ${MAX_ATTEMPTS} attempts.`);
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
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Canvas toBlob returned null'));
            }
        }, 'image/jpeg', 0.98);
    });
  }

  private async _embedGpsData(memory: Memory, fileBlob: Blob): Promise<void> {
    const { latitude, longitude } = memory.location;

    // We only embed metadata in images with a valid location.
    if (memory.type !== 'Image' || !latitude || !longitude) {
      this.zipper.addFile(memory, fileBlob);
      return;
    }
    
    const fileType = await this._getImageFileType(fileBlob);
    const originalExtension = memory.filename.split('.').pop()?.toLowerCase() || '';
    let memoryForZip = { ...memory };

    // Case 1: It's a JPEG. Try to embed EXIF.
    if (fileType?.mime === 'image/jpeg') {
      try {
        const imageWithExif = await this._embedGpsInImage(fileBlob, latitude, longitude, memory.date);
        
        // If original file was mislabeled (e.g. .png but is a .jpg), correct it.
        if (originalExtension !== 'jpg' && originalExtension !== 'jpeg') {
          console.warn(`Correcting file extension for ${memory.filename} to .jpg`);
          memoryForZip.filename = memory.filename.replace(/\.[^/.]+$/, ".jpg");
        }
        
        this.zipper.addFile(memoryForZip, imageWithExif);
        return; // Success!

      } catch (error) {
        console.error(`Could not embed EXIF data in JPEG ${memory.filename}, creating a JSON sidecar file instead.`, error);
        // Fall through to sidecar logic below.
      }
    }
    
    // Case 2: Not a JPEG, or EXIF embedding failed. Create a sidecar.
    if (fileType && fileType.ext !== originalExtension) {
      console.warn(`${memory.filename} has a .${originalExtension} extension but is a ${fileType.ext.toUpperCase()}. Renaming and creating sidecar.`);
      memoryForZip.filename = memory.filename.replace(/\.[^/.]+$/, `.${fileType.ext}`);
    } else if (fileType) {
      console.warn(`${memory.filename} is a ${fileType.ext.toUpperCase()}, which does not support EXIF embedding here. Creating a JSON sidecar file.`);
    } else {
      console.warn(`Could not determine the true file type for ${memory.filename}. Creating a JSON sidecar file instead of embedding metadata.`);
    }
    
    this.zipper.addFile(memoryForZip, fileBlob);
    this._createSidecarFile(memoryForZip, latitude, longitude);
  }

  private _embedGpsInImage(imageBlob: Blob, latitude: number, longitude: number, date: Date): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          let exifObj;
          
          try {
            exifObj = piexif.load(dataUrl);
          } catch (e) {
            // piexif.load throws an error if no EXIF is found. Initialize a new object.
            exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": null };
          }
          
          // Ensure IFD blocks exist
          exifObj["Exif"] = exifObj["Exif"] || {};
          exifObj["GPS"] = exifObj["GPS"] || {};

          // Add/update tags
          exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = this._formatExifDate(date);
          exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = latitude < 0 ? 'S' : 'N';
          exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = this._degToDms(Math.abs(latitude));
          exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = longitude < 0 ? 'W' : 'E';
          exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = this._degToDms(Math.abs(longitude));

          const exifBytes = piexif.dump(exifObj);
          const newDataUrl = piexif.insert(exifBytes, dataUrl);
          
          fetch(newDataUrl).then(res => res.blob()).then(resolve).catch(reject);
        } catch (error) {
          console.error("Failed to embed GPS data:", error);
          reject(error);
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader error:", err);
        reject(err);
      };
      reader.readAsDataURL(imageBlob);
    });
  }

  private _createSidecarFile(memory: Memory, latitude: number, longitude: number): void {
      const sidecarContent = JSON.stringify({
          latitude,
          longitude,
          date: memory.date.toISOString(),
      }, null, 2);
      this.zipper.addSidecarFile(memory, sidecarContent);
  }

  private async _getImageFileType(blob: Blob): Promise<{ ext: string; mime: string } | null> {
    if (blob.size < 12) {
        return null;
    }
    const arr = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    
    // JPEG: FF D8 FF
    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
        return { ext: 'jpg', mime: 'image/jpeg' };
    }
    // PNG: 89 50 4E 47
    if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
        return { ext: 'png', mime: 'image/png' };
    }
    // GIF: 47 49 46 38
    if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) {
        return { ext: 'gif', mime: 'image/gif' };
    }
    
    // HEIC/HEIF check for 'ftyp' at offset 4
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