import { Injectable, inject } from '@angular/core';
import { Memory } from '../models';
import { StateService } from './state.service';
import { TranslateService } from './translate.service';

declare var JSZip: any;

@Injectable({ providedIn: 'root' })
export class ZipperService {
  private zip: any;
  private stateService = inject(StateService);
  private translateService = inject(TranslateService);

  initializeZip(): void {
    this.zip = new JSZip();
  }

  addFile(memory: Memory, data: Blob): void {
    const path = this.getFilePath(memory);
    this.zip.file(path, data);
  }

  addSidecarFile(memory: Memory, content: string): void {
    const path = this.getFilePath(memory).replace(/\.\w+$/, '.json');
    this.zip.file(path, content);
  }
  
  private getFilePath(memory: Memory): string {
    const selection = this.stateService.selection();

    // If a selection has been made (by year or country), put all files in a folder named after the selection.
    if (selection) {
      const translatedSelection = this.translateService.get(String(selection));
      const folderName = this.sanitizeForFilename(translatedSelection);
      return `${folderName}/${memory.filename}`;
    }
    
    // Fallback to the original structure if no selection is made (should not happen in normal flow).
    const year = memory.date.getFullYear();
    const translatedCountry = this.translateService.get(memory.country || 'COUNTRY_UNKNOWN');
    const country = this.sanitizeForFilename(translatedCountry);
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
  
  async generateZip(): Promise<Blob> {
      if (!this.zip) {
          throw new Error("ZIP instance not initialized.");
      }
      return this.zip.generateAsync({ type: 'blob' });
  }
}