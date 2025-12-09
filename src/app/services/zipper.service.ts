import { Injectable, inject } from '@angular/core';
import { Memory } from '../models';
import { StateService } from './state.service';
import { TranslateService } from './translate.service';

import JSZip from 'jszip';

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

  addReportFile(htmlContent: string): void {
    if (!this.zip) {
      throw new Error("ZIP instance not initialized.");
    }
    // Place the report in the root of the ZIP for easy access.
    this.zip.file("_Snaploader-Report.html", htmlContent);
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

  async generateZip(): Promise<Blob> {
    if (!this.zip) {
      throw new Error("ZIP instance not initialized.");
    }
    return this.zip.generateAsync({ type: 'blob' });
  }
}
