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
  completed: number;
  size: number;
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