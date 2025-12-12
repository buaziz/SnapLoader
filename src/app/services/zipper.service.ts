import { Injectable, inject } from '@angular/core';
import { Memory } from '../models';
import { StateService } from './state.service';
import { TranslateService } from './translate.service';

import JSZip from 'jszip';
import { downloadZip } from 'client-zip';

@Injectable({ providedIn: 'root' })
export class ZipperService {
  private zip: any;
  private stateService = inject(StateService);
  private translateService = inject(TranslateService);
  
  // Store blobs for streaming access
  private fileBlobs: Map<string, Blob> = new Map();

  /**
   * Check if browser supports File System Access API for streaming ZIP
   */
  supportsStreamingZip(): boolean {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  }

  initializeZip(): void {
    this.zip = new JSZip();
    this.fileBlobs.clear();
  }

  addFile(memory: Memory, data: Blob): void {
    const path = this.getFilePath(memory);
    this.zip.file(path, data);
    // Also store blob for streaming access
    this.fileBlobs.set(path, data);
  }

  addReportFile(htmlContent: string): void {
    if (!this.zip) {
      throw new Error("ZIP instance not initialized.");
    }
    const reportFilename = "_Snaploader-Report.html";
    this.zip.file(reportFilename, htmlContent);
    // Store as blob for streaming
    const blob = new Blob([htmlContent], { type: 'text/html' });
    this.fileBlobs.set(reportFilename, blob);
  }

  /**
   * Get all files prepared for streaming ZIP generation
   */
  getFilesForStreaming(): Array<{ name: string; input: Blob }> {
    return Array.from(this.fileBlobs.entries()).map(([name, input]) => ({
      name,
      input
    }));
  }

  private getFilePath(memory: Memory): string {
    const selection = this.stateService.selection();

    // Handle COUNTRY/YEAR structure for country drill-down
    if (this.stateService.yearSelectionForCountryActive() && typeof selection === 'string') {
      const translatedCountry = this.translateService.get(selection);
      const countryFolder = this.sanitizeForFilename(translatedCountry);
      const yearFolder = memory.date.getFullYear();
      return `${countryFolder}/${yearFolder}/${memory.filename}`;
    }

    if (selection) {
      // Handle YEAR or COUNTRY structure for simple selections
      const translatedSelection = this.translateService.get(String(selection));
      const folderName = this.sanitizeForFilename(translatedSelection);
      return `${folderName}/${memory.filename}`;
    }

    // Fallback to the original structure if no selection is made (should not happen in normal flow).
    const year = memory.date.getFullYear();
    const translatedCountry = this.translateService.get(memory.country);
    const country = this.sanitizeForFilename(translatedCountry || 'COUNTRY_UNKNOWN');
    return `${year}/${country}/${memory.filename}`;
  }

  private sanitizeForFilename(name: string): string {
    // Remove characters that are invalid in file and folder names across major OSes.
    const invalidChars = /[\\/?%*:|"<>]/g;
    const sanitized = name.replace(invalidChars, '');

    // Replace one or more whitespace characters with a single underscore.
    const finalName = sanitized.replace(/\s+/g, '_').trim();

    // Provide a fallback name if the sanitization results in an empty string.
    return finalName || 'Invalid_Name';
  }

  /**
   * Generate ZIP using streaming (File System Access API)
   * User picks save location, files stream directly to disk
   */
  async generateZipStream(filename: string): Promise<boolean> {
    try {
      // User picks save location
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'ZIP Archive',
          accept: { 'application/zip': ['.zip'] }
        }]
      });

      // Get writable stream
      const writable = await fileHandle.createWritable();

      // Get files for streaming
      const files = this.getFilesForStreaming();
      
      console.log(`Streaming ${files.length} files to disk...`);

      // Create ZIP stream and pipe to disk
      const zipStream = downloadZip(files).body;
      if (!zipStream) {
        throw new Error('Failed to create ZIP stream');
      }

      await zipStream.pipeTo(writable);
      
      console.log('✅ ZIP streamed successfully to disk - minimal memory usage!');
      return true;
    } catch (error) {
      // User cancelled or permission denied
      if ((error as Error).name === 'AbortError') {
        console.log('User cancelled file save');
        return false;
      }
      console.error('Failed to stream ZIP:', error);
      throw error;
    }
  }

  /**
   * Generate ZIP using traditional method (JSZip)
   * Entire ZIP assembled in memory, then downloaded
   */
  async generateZip(): Promise<Blob> {
    if (!this.zip) {
      throw new Error("ZIP instance not initialized.");
    }

    try {
      // Use DEFLATE compression to reduce file size and prevent corruption
      const blob = await this.zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6 // Balance between speed and compression (1-9)
        }
      });

      // Validate the generated blob
      if (!blob || blob.size === 0) {
        throw new Error('ZIP generation produced an empty file (0 bytes). This may indicate a processing error.');
      }

      console.log(`Generated ZIP: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
      return blob;
    } catch (error) {
      console.error('Failed to generate ZIP archive:', error);
      throw new Error(`ZIP generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
