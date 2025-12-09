import { Injectable } from '@angular/core';
import { Memory } from '../models';

export interface ParseResult {
  memories: Memory[];
  expiresAt: Date | null;
}

@Injectable({ providedIn: 'root' })
export class SnapParserService {

  async parse(htmlContent: string): Promise<ParseResult> {
    const memories: Memory[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const rows = doc.querySelectorAll('tbody tr');
    let latestCreationDate: Date | null = null;

    for (const row of Array.from(rows)) {
      try {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) continue;

        const dateStr = cells[0].textContent?.trim() || '';
        const type = (cells[1].textContent?.trim() || '') as 'Image' | 'Video';
        const locationStr = cells[2].textContent?.trim() || '';
        const downloadLink = cells[3].querySelector('a');
        
        if (!downloadLink) continue;

        const onclickAttr = downloadLink.getAttribute('onclick') || '';
        const onclickMatch = onclickAttr.match(/downloadMemories\('([^']*)',\s*this,\s*(true|false)\)/);
        if (!onclickMatch) continue;

        const mainUrl = onclickMatch[1];
        const mainIsGet = onclickMatch[2] === 'true';
        
        if (!mainUrl || !dateStr || !type || (type !== 'Image' && type !== 'Video')) continue;

        // --- CORRECTED LOGIC ---
        // Find the latest timestamp, which represents the CREATION date of the export.
        if (mainIsGet) {
          try {
            const url = new URL(mainUrl);
            const creationTimestamp = url.searchParams.get('ts');
            if (creationTimestamp) {
                const timestampNum = parseInt(creationTimestamp, 10);
                if (!isNaN(timestampNum)) {
                    const currentCreationDate = new Date(timestampNum);
                    if (!latestCreationDate || currentCreationDate > latestCreationDate) {
                        latestCreationDate = currentCreationDate;
                    }
                }
            }
          } catch(e) {
            console.warn("Could not parse a URL to find a creation date", e);
          }
        }

        const date = new Date(dateStr.replace(' UTC', 'Z'));
        
        const locationMatch = locationStr.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
        let lat = 0;
        let lng = 0;
        if (locationMatch && locationMatch.length === 3) {
          lat = parseFloat(locationMatch[1]);
          lng = parseFloat(locationMatch[2]);
        }
        
        const location = { 
          latitude: (isNaN(lat) || lat < -90 || lat > 90) ? 0 : lat,
          longitude: (isNaN(lng) || lng < -180 || lng > 180) ? 0 : lng
        };
        
        const id = await this.hashString(mainUrl);
        const fileExtension = type === 'Image' ? 'jpg' : 'mp4';
        const filename = `${this.formatDateForFilename(date)}_${type}_${id.substring(0, 8)}.${fileExtension}`;

        memories.push({
          id,
          date,
          type,
          location,
          country: 'PENDING_GEOCODING',
          downloadUrl: mainUrl,
          isGetRequest: mainIsGet,
          filename,
        });
      } catch (e) {
        console.error('Failed to parse a memory row', e, row);
      }
    }
    
    // --- CORRECTED CALCULATION ---
    // The expiration date is exactly 7 days after the creation date.
    let finalExpiresAt: Date | null = null;
    if (latestCreationDate) {
        const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
        finalExpiresAt = new Date(latestCreationDate.getTime() + sevenDaysInMillis);
    }

    return { memories, expiresAt: finalExpiresAt };
  }

  private async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private formatDateForFilename(date: Date): string {
    const YYYY = date.getUTCFullYear();
    const MM = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const DD = date.getUTCDate().toString().padStart(2, '0');
    const hh = date.getUTCHours().toString().padStart(2, '0');
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return `${YYYY}-${MM}-${DD}_${hh}-${mm}-${ss}`;
  }
}