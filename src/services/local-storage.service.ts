import { Injectable } from '@angular/core';
import { Memory, MemoryHistory } from '../models';

// This should be updated to match package.json version on new releases
// to invalidate old storage structures.
const APP_VERSION = '2.0.0';

interface StoredHistory {
  [memoryId: string]: MemoryHistory;
}

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  private readonly _versionKey = 'snaploaderVersion';
  private readonly _dataHashKey = 'snaploaderDataHash';
  private readonly _historyKey = 'snaploaderHistory';

  private currentHistory: StoredHistory = {};

  async init(memories: readonly Memory[]): Promise<void> {
    const storedVersion = localStorage.getItem(this._versionKey);
    const storedDataHash = localStorage.getItem(this._dataHashKey);
    const newDataHash = await this._hashMemories(memories);

    if (storedVersion !== APP_VERSION || storedDataHash !== newDataHash) {
      console.log('App version or data file changed. Resetting download history.');
      this.clearSession();
      localStorage.setItem(this._versionKey, APP_VERSION);
      localStorage.setItem(this._dataHashKey, newDataHash);
      this.currentHistory = {};
    } else {
      console.log('Matching data file detected. Loading previous download history.');
      this._loadFromStorage();
    }
  }

  recordSuccess(memoryId: string): void {
    const entry = this.currentHistory[memoryId] || { successCount: 0, failCount: 0 };
    entry.successCount++;
    this.currentHistory[memoryId] = entry;
    this._saveToStorage();
  }

  recordFailure(memoryId: string): void {
    const entry = this.currentHistory[memoryId] || { successCount: 0, failCount: 0 };
    entry.failCount++;
    this.currentHistory[memoryId] = entry;
    this._saveToStorage();
  }
  
  getHistoryForMemories(memoryIds: string[]): ReadonlyMap<string, MemoryHistory> {
    const historyMap = new Map<string, MemoryHistory>();
    for (const id of memoryIds) {
        if (this.currentHistory[id]) {
            historyMap.set(id, { ...this.currentHistory[id] });
        }
    }
    return historyMap;
  }
  
  clearSession(): void {
    localStorage.removeItem(this._historyKey);
    localStorage.removeItem(this._dataHashKey);
    // Do not remove version key here, it's used for comparison on next init.
    this.currentHistory = {};
  }

  private _loadFromStorage(): void {
    try {
      const storedJson = localStorage.getItem(this._historyKey);
      if (storedJson) {
        this.currentHistory = JSON.parse(storedJson);
      } else {
        this.currentHistory = {};
      }
    } catch (e) {
      console.error('Failed to parse download history from localStorage.', e);
      this.currentHistory = {};
    }
  }

  private _saveToStorage(): void {
    try {
      localStorage.setItem(this._historyKey, JSON.stringify(this.currentHistory));
    } catch (e) {
      console.error('Failed to save download history to localStorage.', e);
    }
  }

  private async _hashMemories(memories: readonly Memory[]): Promise<string> {
    if (memories.length === 0) return 'no-memories';
    
    // Use first and last memory URLs as a representative sample for hashing.
    const firstUrl = memories[0].downloadUrl;
    const lastUrl = memories[memories.length - 1].downloadUrl;
    const combined = `${memories.length}|${firstUrl}|${lastUrl}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
