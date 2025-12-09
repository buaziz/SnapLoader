export interface Memory {
    id: string;
    date: Date;
    type: 'Image' | 'Video';
    location: {
        latitude: number;
        longitude: number;
    };
    country: string;
    downloadUrl: string;
    isGetRequest: boolean;
    overlayUrl?: string;
    overlayIsGetRequest?: boolean;
    filename: string;
    downloadState?: 'pending' | 'processing' | 'success' | 'error';
    downloadProgress?: number;
    retryCount?: number;
}

export interface YearSummary {
    year: number;
    images: number;
    videos: number;
    total: number;
    // Session-specific progress (visual)
    completed: number;
    size: number;
    // Persistent download history
    downloadedCount: number;
    failedCount: number;
}

export interface MonthSummary {
    month: number; // 0-11 for Date object consistency
    monthName: string;
    images: number;
    videos: number;
    total: number;
    // Persistent download history
    downloadedCount: number;
    failedCount: number;
}

export interface CountrySummary {
    country: string;
    total: number;
    status: 'normal' | 'unidentified' | 'no-data';
}

export interface ParseResult {
    memories: Memory[];
    expiresAt: Date | null;
}

export interface Batch {
    batchNum: number;
    totalBatches: number;
    memories: readonly Memory[];
    status: 'planned' | 'processing' | 'success' | 'error';
    zipFilename: string;
    zipBlobUrl?: string;
}

export interface MemoryHistory {
    successCount: number;
    failCount: number;
}
