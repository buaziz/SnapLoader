# AI_CONTEXT.md

## Project Overview

### What is Snaploader?

**Snaploader** is a privacy-first, client-side web application that allows users to download, organize, and enrich their Snapchat memories. All processing happens entirely in the browser—no data is ever uploaded to external servers.

**Live Demo:** https://snap-loader.vercel.app/

### Core Purpose

Users receive their Snapchat data export as a ZIP file containing a `memories_history.html` file with links to their photos and videos. However, these links:

- Expire after a certain time
- Don't include GPS metadata in the downloaded files
- Are difficult to organize and batch download

Snaploader solves these problems by:

1. **Parsing** the HTML file to extract memory metadata
2. **Downloading** files directly in the browser
3. **Geocoding** coordinates to country names (100% offline)
4. **Embedding** GPS EXIF data into JPEG images
5. **Organizing** files into year/country folder structures
6. **Generating** ZIP archives efficiently (streaming for Chrome/Edge, in-memory for Firefox/Safari)

### Key Features

- ✅ **100% Client-Side Processing** - Zero server uploads, complete privacy
- ✅ **Automatic Geocoding** - Offline country detection using GeoJSON polygons
- ✅ **GPS Metadata Embedding** - EXIF data for JPEGs (MP4s unsupported due to browser limitations)
- ✅ **Smart Download History** - Tracks progress in localStorage to resume downloads
- ✅ **Link Validation** - Detects expired Snapchat export links before download
- ✅ **Streaming ZIP Generation** - Unlimited capacity on Chrome/Edge using File System Access API
- ✅ **Batch Processing** - Automatic batching for large collections (500+ memories)
- ✅ **Drill-Down Filtering** - Month/year selection for large datasets
- ✅ **Multi-language Support** - i18n with JSON translation files
- ✅ **Responsive UI** - Works on desktop and mobile browsers

### Current Status

- **Version:** 0.0.0 (initial release)
- **Deployment:** Live on Vercel
- **Status:** Production-ready, fully functional
- **Built with:** Google Antigravity (advanced agentic AI coding assistant)

### Roadmap

- [ ] Add support for more social media exports (Instagram, Facebook)
- [ ] Support for additional metadata formats
- [ ] Performance optimizations for very large datasets (10k+ memories)
- [ ] PWA (Progressive Web App) capabilities for offline use
- [ ] Enhanced error recovery and retry mechanisms

---

## Technology Stack

### Core Framework

| Technology     | Version   | Purpose                                              |
| -------------- | --------- | ---------------------------------------------------- |
| **Angular**    | `^21.0.0` | Frontend framework (zoneless, standalone components) |
| **TypeScript** | `~5.9.2`  | Type-safe development                                |
| **RxJS**       | `~7.8.0`  | Reactive programming (minimal usage, mostly Signals) |

### Build Tools

| Tool               | Version   | Notes                                       |
| ------------------ | --------- | ------------------------------------------- |
| **@angular/cli**   | `^21.0.2` | Angular CLI for builds and dev server       |
| **@angular/build** | `^21.0.2` | Modern Angular build system (esbuild-based) |
| **npm**            | `11.6.2`  | Package manager                             |

### Styling

| Technology       | Version    | Notes                       |
| ---------------- | ---------- | --------------------------- |
| **Tailwind CSS** | `^3.4.17`  | Utility-first CSS framework |
| **PostCSS**      | `^8.4.38`  | CSS processing              |
| **Autoprefixer** | `^10.4.19` | Browser prefix automation   |

### Key Libraries

| Library        | Version   | Purpose                                              | Critical Notes                                         |
| -------------- | --------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **JSZip**      | `^3.10.1` | In-memory ZIP creation (fallback for Firefox/Safari) | Used when File System Access API unavailable           |
| **client-zip** | `^2.5.0`  | Streaming ZIP generation                             | Requires File System Access API (Chrome 86+, Edge 86+) |
| **file-saver** | `^2.0.5`  | Blob download utility                                | Used for traditional ZIP downloads                     |
| **piexifjs**   | `^1.0.6`  | EXIF metadata embedding                              | JPEG only, MP4 not supported in browser                |

### Testing

| Tool       | Version   | Notes                     |
| ---------- | --------- | ------------------------- |
| **Vitest** | `^4.0.8`  | Unit testing framework    |
| **jsdom**  | `^27.1.0` | DOM environment for tests |

### Development Dependencies

```json
{
  "@types/file-saver": "^2.0.7",
  "@types/jszip": "^3.4.0"
}
```

---

## Architecture

### Directory Structure

```
snaploader/
├── .agent/                   # AI agent workflows
│   └── workflows/           # Workflow definitions
├── .angular/                # Angular build cache (gitignored)
├── .vscode/                 # VS Code settings
│   ├── extensions.json      # Recommended extensions
│   ├── launch.json          # Debug configurations
│   └── tasks.json           # Build tasks
├── dist/                    # Build output (gitignored)
├── node_modules/            # Dependencies (gitignored)
├── public/                  # Static assets
│   ├── i18n/               # Translation JSON files
│   │   ├── ar.json         # Arabic
│   │   ├── en.json         # English
│   │   ├── es.json         # Spanish
│   │   ├── fr.json         # French
│   │   ├── de.json         # German
│   │   ├── it.json         # Italian
│   │   └── pt.json         # Portuguese
│   └── favicon.ico         # Application icon
├── src/
│   ├── app/
│   │   ├── components/     # UI components (18 total)
│   │   ├── pipes/          # Custom pipes
│   │   ├── services/       # Business logic services (11 total)
│   │   ├── app.component.html  # Main template
│   │   ├── app.component.ts    # Root component
│   │   ├── app.config.ts       # Application configuration
│   │   ├── app.routes.ts       # Routing (minimal)
│   │   └── models.ts          # TypeScript interfaces
│   ├── types/              # Type definitions
│   ├── index.html          # HTML entry point
│   ├── main.ts             # Bootstrap file
│   ├── styles.css          # Global Tailwind imports
│   └── types.d.ts          # Ambient type declarations
├── angular.json            # Angular CLI configuration
├── package.json            # Dependencies and scripts
├── postcss.config.js       # PostCSS configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── tsconfig.app.json       # App-specific TS config
├── tsconfig.spec.json      # Test-specific TS config
└── README.md               # User-facing documentation
```

### Design Patterns

#### 1. **Zoneless Architecture**

- Uses Angular's experimental zoneless mode for better performance
- Relies on Signals for reactivity instead of Zone.js
- All components use `ChangeDetectionStrategy.OnPush` implicitly

#### 2. **Signal-Based State Management**

- **StateService** holds all application state in `signal()` primitives
- Derived state uses `computed()` for automatic recalculation
- No external state management library (NgRx, Akita, etc.) needed

```typescript
// Example from StateService
memories = signal<readonly Memory[]>([]);
selectedYears = signal<readonly number[]>([]);
selectedCountries = signal<readonly string[]>([]);

// Derived computed signal
yearSummaries = computed(() => {
  // Automatically recalculates when memories() changes
  const memoryList = this.memories();
  // ... aggregation logic
});
```

#### 3. **Service Layer Architecture**

```
┌─────────────────┐
│  AppComponent   │  (UI Layer)
└────────┬────────┘
         │
    ┌────▼────────────────────────────┐
    │      StateService               │  (State Management)
    │  - Reactive signals             │
    │  - Computed derived state       │
    └────┬────────────────────────────┘
         │
    ┌────▼─────────┬──────────┬───────────┐
    │              │          │           │
┌───▼───────┐ ┌───▼─────┐ ┌──▼──────┐ ┌─▼──────────┐
│ Download  │ │ Zipper  │ │Geocoding│ │SnagParser  │
│  Service  │ │ Service │ │ Service │ │  Service   │
└───────────┘ └─────────┘ └─────────┘ └────────────┘
```

#### 4. **Dependency Injection**

- Uses Angular's `inject()` function (function-based DI)
- All services are `@Injectable({ providedIn: 'root' })`
- No constructor-based injection

```typescript
export class DownloadService {
  private stateService = inject(StateService);
  private zipper = inject(ZipperService);
  // ...
}
```

#### 5. **Standalone Components**

- No NgModules, all components are standalone
- Direct imports in component metadata

```typescript
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SomeOtherComponent],
  // ...
})
```

### How Different Parts Communicate

#### User Uploads File → Parsing

1. User selects ZIP or HTML file via `<input type="file">`
2. `AppService.handleFileUpload()` determines file type
3. If ZIP: Uses `JSZip` to extract `memories_history.html`
4. `SnapParserService.parseHtmlContent()` parses the HTML using `DOMParser`
5. Extracts: filename, date, location, download URL, expiration date
6. `GeocodingService.getCountryFromCoordinates()` converts lat/lng to country names
7. Parsed memories stored in `StateService.memories` signal
8. UI automatically updates via computed signals

#### User Selects Year/Country → Download

1. User clicks on year or country card
2. `StateService.selectItem()` updates selection signals
3. Computed signals recalculate `selectedMemories()`
4. User clicks "Download" button
5. `DownloadService.startDownload()` is called
6. Service checks browser support → determines streaming vs. in-memory mode
7. If large selection (500+): Creates batches via `prepareBatches()`
8. For each memory:
   - Downloads file using `fetch()` with retry logic
   - If ZIP format: Unzips and extracts media + overlay
   - If JSON manifest: Fetches real URLs from manifest
   - Merges overlay images using Canvas API if needed
   - Embeds GPS EXIF data for JPEGs using `piexifjs`
9. Files added to `ZipperService`
10. Final ZIP generated:
    - **Streaming mode**: `client-zip` + File System Access API → direct disk write
    - **Traditional mode**: `JSZip` + `FileSaver` → in-memory blob download

---

## Deployment Configuration

### Platform: Vercel

**Live URL:** https://snap-loader.vercel.app/

### Build Configuration

The project is configured for Vercel's automatic Angular detection.

**No `vercel.json` required** - Vercel auto-detects Angular and uses these settings:

```json
{
  "buildCommand": "ng build --configuration production",
  "outputDirectory": "dist/snaploader/browser",
  "devCommand": "ng serve",
  "framework": "angular"
}
```

### Build Process

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Production Build:**

   ```bash
   npm run build
   # Internally runs: ng build --configuration production
   ```

3. **Output Location:**
   ```
   dist/snaploader/browser/
   ```

### Vercel-Specific Settings

- **Framework Preset:** Angular
- **Node Version:** 18.x (Vercel default)
- **Install Command:** `npm install`
- **Build Command:** `npm run build` (maps to `ng build`)
- **Output Directory:** `dist/snaploader/browser`

### Environment Variables

**This project has ZERO environment variables.** Everything runs client-side.

### Browser Compatibility Configuration

The application detects browser capabilities at runtime:

```typescript
// From ZipperService
supportsStreamingZip(): boolean {
  return (
    'showSaveFilePicker' in window &&
    typeof window.showSaveFilePicker === 'function'
  );
}
```

**Streaming ZIP Support:**

- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ❌ Firefox (uses in-memory fallback)
- ❌ Safari (uses in-memory fallback)

### Bundle Size Budgets

Configured in `angular.json`:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "500kB",
      "maximumError": "1MB"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "4kB",
      "maximumError": "8kB"
    }
  ]
}
```

### CommonJS Dependencies

The following libraries are allowed as CommonJS (configured in `angular.json`):

```json
{
  "allowedCommonJsDependencies": ["jszip", "piexifjs", "mp4box"]
}
```

This prevents build warnings for these legacy modules.

---

## Database/Storage Architecture

### No Traditional Database

This application is **100% client-side** and does not use:

- ❌ PostgreSQL
- ❌ MongoDB
- ❌ SQLite
- ❌ IndexedDB
- ❌ Any server-side database

### Client-Side Storage: LocalStorage

**Purpose:** Persist download history across sessions

**Service:** `LocalStorageService`

**Storage Key Structure:**

```typescript
private readonly STORAGE_KEY = 'snaploader-history';
```

**Stored Data Format:**

```typescript
interface MemoryHistory {
  downloaded: string[]; // Array of memory IDs
  failed: string[]; // Array of memory IDs
}

interface StoredHistory {
  version: string; // App version (from package.json)
  fileHash: string; // Hash of memories_history.html content
  history: MemoryHistory;
}
```

### Why Hash the File?

The history is **tied to a specific data export file**. If the user uploads a new `memories_history.html`:

- The hash changes
- History is automatically reset
- Prevents conflicts between different export files

### LocalStorage Schema

```json
{
  "snaploader-history": {
    "version": "0.0.0",
    "fileHash": "abc123...",
    "history": {
      "downloaded": ["mem-1", "mem-2", "mem-3"],
      "failed": ["mem-99"]
    }
  }
}
```

### Storage Versioning Strategy

When app version changes:

1. `LocalStorageService.getHistory()` checks stored version
2. If version mismatch → clears history
3. Prevents schema conflicts across versions

```typescript
if (stored.version !== this.appVersion) {
  this.clearHistory();
  return { downloaded: [], failed: [] };
}
```

### In-Memory State (Runtime Only)

The `StateService` holds runtime state in Angular Signals (not persisted):

```typescript
// Ephemeral state (lost on page refresh)
memories = signal<readonly Memory[]>([]);
selectedYears = signal<readonly number[]>([]);
selectedCountries = signal<readonly string[]>([]);
status = signal<AppStatus>('idle');
// ... etc
```

### GeoJSON Data

**Purpose:** Offline geocoding (coordinates → country names)

**File:** Fetched from external CDN at runtime

```typescript
// From GeocodingService
private readonly GEOJSON_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
```

**Caching:** Browser HTTP cache (no manual caching implemented)

---

## Environment Variables

### The Simple Truth: There Are None

This project does **not use environment variables** because:

1. It's a purely client-side application
2. No API keys or secrets required
3. No backend server to configure
4. All external resources (GeoJSON) use public CDNs

### No `.env` File Needed

You will **not** find:

- ❌ `.env`
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ `environment.ts`
- ❌ `environment.prod.ts`

### Configuration Constants

Hard-coded constants are defined directly in services:

```typescript
// From StateService
const DEV_MODE = false;
const DEV_BATCH_SIZE = 10;
const PROD_LARGE_SELECTION_THRESHOLD = 500;

// From DownloadService
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const CONCURRENT_DOWNLOADS = 5;
const SOFT_MEMORY_LIMIT = 400 * 1024 * 1024; // 400MB
const HARD_MEMORY_LIMIT = 600 * 1024 * 1024; // 600MB

// From GeocodingService
private readonly GEOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
```

### Developer Mode Toggle

The **only** configuration toggle exists for testing:

```typescript
// In src/app/services/state.service.ts
const DEV_MODE = false; // Set to true for testing batch processing
```

When `DEV_MODE = true`:

- Large selection threshold drops to 10 memories (instead of 500)
- Allows testing batch processing without huge datasets

**⚠️ CRITICAL:** Always set `DEV_MODE = false` before production deployment!

---

## Build & Development Process

### Local Development Setup

#### Prerequisites

- **Node.js:** 18.x or higher
- **npm:** Comes with Node.js (project uses npm 11.6.2)

#### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd snaploader

# Install dependencies
npm install

# Start development server
npm start

# Open browser
# Navigate to http://localhost:4200/
```

### Common Development Commands

| Command         | Purpose            | Notes                                  |
| --------------- | ------------------ | -------------------------------------- |
| `npm start`     | Start dev server   | Alias for `ng serve`                   |
| `npm run build` | Production build   | Runs `ng build` with production config |
| `npm run watch` | Watch mode build   | Rebuilds on file changes               |
| `npm test`      | Run unit tests     | Uses Vitest                            |
| `npm run ng`    | Access Angular CLI | For advanced CLI commands              |

### Build Process Details

#### Development Build

```bash
npm start
# or
ng serve
```

**Configuration:**

- **Optimization:** Disabled
- **Source Maps:** Enabled
- **License Extraction:** Disabled
- **Port:** 4200 (default)
- **Live Reload:** Enabled

#### Production Build

```bash
npm run build
# or
ng build --configuration production
```

**Configuration:**

- **Optimization:** Enabled (minification, tree-shaking)
- **Source Maps:** Disabled
- **Output Hashing:** Enabled (cache busting)
- **Bundle Budgets:** Enforced (500kB warning, 1MB error)
- **Output Directory:** `dist/snaploader/browser/`

### Testing Workflow

#### Running Tests

```bash
npm test
```

#### Test Structure

Tests use **Vitest** (not Karma/Jasmine):

```typescript
import { describe, it, expect } from 'vitest';

describe('DownloadService', () => {
  it('should validate blobs', () => {
    const emptyBlob = new Blob([]);
    expect(emptyBlob.size).toBe(0);
  });
});
```

#### Test Configuration

**File:** `tsconfig.spec.json`

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*.spec.ts"]
}
```

### TypeScript Strict Mode

The project uses **strict TypeScript** settings:

```json
{
  "strict": true,
  "noImplicitOverride": true,
  "noPropertyAccessFromIndexSignature": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

**What this means for AI assistants:**

- All variables must be explicitly typed or inferrable
- No `any` types without explicit declaration
- All function returns must be defined
- Strict null checks enforced

---

## Lessons Learned

### 1. ❌ **MISTAKE:** Trying to Embed GPS in MP4 Files

**What we tried:**
Initially attempted to use `mp4box` library to embed GPS metadata into MP4 video files.

**The problem:**

- Browser environments cannot safely manipulate MP4 box structures
- `mp4box` requires Node.js filesystem APIs
- Even if we could modify the MP4, browsers can't write to ArrayBuffer atomically

**The fix:**

- Accept that **MP4 GPS embedding is impossible in browsers**
- Document this limitation clearly in README
- Only embed GPS data in JPEG images using `piexifjs`

**Code pattern that works:**

```typescript
// JPEG: ✅ Works
if (memory.type === 'Image') {
  fileBlob = await this._embedGpsData(memory, fileBlob);
}

// MP4: ❌ Not possible in browser
if (memory.type === 'Video') {
  // Skip GPS embedding, just download as-is
}
```

### 2. ❌ **MISTAKE:** Assuming All Memories Are Direct File Links

**What we tried:**
Initially expected all Snapchat download URLs to point directly to `.jpg` or `.mp4` files.

**The reality:**
Snapchat uses **three different download formats:**

1. **Direct file:** `https://example.com/file.jpg`
2. **ZIP archive:** `https://example.com/archive.zip` (contains `main.jpg` + `overlay.png`)
3. **JSON manifest:** `https://example.com/manifest.json` (contains URLs to actual files)

**The fix:**
Built robust format detection and handling:

```typescript
// Check if response is a ZIP file
const isZip = await this._isZipFile(blob);

if (isZip) {
  // Unzip and extract media + overlay
  const zip = await JSZip.loadAsync(blob);
  const mainFile = findFile((f) => f.startsWith('main.'));
  const overlayFile = findFile((f) => f.startsWith('overlay.'));

  // Merge overlay onto main image using Canvas
  finalBlob = await this._mergeImages(mainBlob, overlayBlob);
}
```

**Lesson:** Always inspect real-world API responses before assuming formats.

### 3. ✅ **SUCCESS:** Streaming ZIP on Chromium, Fallback for Others

**The challenge:**
Creating large ZIPs (1000+ files) crashes Firefox/Safari due to memory limits.

**The solution:**
Browser capability detection with graceful degradation:

```typescript
if (this.zipper.supportsStreamingZip()) {
  // Chrome/Edge: Stream directly to disk (unlimited capacity)
  await this.zipper.generateZipStream(filename);
} else {
  // Firefox/Safari: Batch into 500-file chunks
  this.prepareBatches(memories);
}
```

**Why it works:**

- Chrome 86+ supports File System Access API
- Streaming writes files directly to disk (no memory limit)
- Firefox/Safari get automatic batching to prevent crashes

**Lesson:** Always provide fallback strategies for unsupported browsers.

### 4. ❌ **MISTAKE:** Not Validating Link Expiration Early

**What happened:**
Users started downloads, waited minutes, then got "403 Forbidden" errors.

**The problem:**
Snapchat export links expire after a certain time. We weren't checking expiration before starting downloads.

**The fix:**
Parse expiration timestamp from URL and validate upfront:

```typescript
// From SnapParserService
const url = new URL(downloadUrl);
const params = new URLSearchParams(url.search);
const expires = params.get('Expires');

if (expires) {
  // Parse timestamp (could be seconds or milliseconds)
  let expirationDate = new Date(parseInt(expires) * 1000);

  // If date is in past (year < 2000), it's likely milliseconds
  if (expirationDate.getFullYear() < 2000) {
    expirationDate = new Date(parseInt(expires));
  }

  memory.expirationDate = expirationDate;
}
```

Then in UI, show warning **before** download starts:

```html
<div *ngIf="linkExpired" class="text-red-500">
  ⚠️ Your export links have expired. Download a new data export from Snapchat.
</div>
```

**Lesson:** Validate external resource availability before starting long-running operations.

### 5. ✅ **SUCCESS:** Using Signals for Reactive State

**Why we chose it:**
Angular's new Signals API is simpler than RxJS for state management.

**Pattern that works:**

```typescript
// StateService
memories = signal<readonly Memory[]>([]);

// Automatically recalculates when memories change
yearSummaries = computed(() => {
  const memoryList = this.memories();

  // Group by year
  const grouped = memoryList.reduce((acc, memory) => {
    const year = memory.date.getFullYear();
    // ...
  }, {});

  return Object.values(grouped);
});
```

**Benefits:**

- Zero boilerplate compared to NgRx
- Automatic dependency tracking
- Better TypeScript inference
- No subscription management

**Lesson:** For apps without complex async flows, Signals > RxJS Observables.

### 6. ❌ **MISTAKE:** Forgetting to Validate Downloaded Blobs

**What happened:**
Some memories would fail silently, resulting in empty files in the ZIP.

**The problem:**
Network errors or corrupt responses returned empty blobs (size = 0).

**The fix:**
Always validate before adding to ZIP:

```typescript
_validateBlob(blob: Blob, filename: string): boolean {
  if (!blob || blob.size === 0) {
    console.error(`[Validation Failed] ${filename}: Empty blob`);
    return false;
  }

  const validMimes = [
    'image/jpeg', 'image/jpg', 'image/png',
    'video/mp4', 'video/quicktime'
  ];

  if (!validMimes.includes(blob.type)) {
    console.error(`[Validation Failed] ${filename}: Invalid MIME (${blob.type})`);
    return false;
  }

  return true;
}
```

**Lesson:** Never trust external API responses. Always validate before processing.

### 7. ✅ **SUCCESS:** Smart Pre-selection Using LocalStorage

**The feature:**
For large datasets, the app shows which months/years are already downloaded.

**How it works:**

1. **Save history after each download:**

   ```typescript
   localStorageService.markAsDownloaded(memory.id);
   ```

2. **On next session, pre-deselect completed items:**

   ```typescript
   const history = localStorageService.getHistory();
   const monthMemories = memories.filter((m) => m.date.getMonth() === month);
   const allDownloaded = monthMemories.every((m) => history.downloaded.includes(m.id));

   if (allDownloaded) {
     selectedMonths.update((months) => months.filter((m) => m !== month));
   }
   ```

**Why it's great:**

- Users can download in multiple sessions
- No need to re-download already completed months
- Complete transparency (shows "✓ Completed" badges)

**Lesson:** LocalStorage + smart UX = powerful user experience without a backend.

### 8. ❌ **MISTAKE:** Not Handling Canvas Size Limits

**What happened:**
Some high-resolution images caused canvas operations to fail silently.

**The problem:**
Browsers have maximum canvas dimensions (typically 4096x4096 or 8192x8192).

**The fix:**
Check and resize before canvas operations:

```typescript
const MAX_IMAGE_DIMENSION = 4096;

const img = new Image();
img.src = URL.createObjectURL(mainBlob);

await new Promise((resolve) => {
  img.onload = () => {
    let { width, height } = img;

    // Scale down if too large
    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
      width *= scale;
      height *= scale;
    }

    canvas.width = width;
    canvas.height = height;
    resolve();
  };
});
```

**Lesson:** Always respect browser limitations, especially for Canvas API.

---

## Critical Patterns

### 1. **File Processing Pattern: Robust Retry with Exponential Backoff**

```typescript
async fetchWithRetry(
  url: string,
  isGetRequest: boolean,
  filename: string
): Promise<Blob> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const method = isGetRequest ? 'GET' : 'POST';
      const response = await fetch(url, { method });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.blob();

    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;

      // Exponential backoff
      await new Promise(resolve =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      );
    }
  }
}
```

**Why this works:**

- Handles transient network errors
- Exponential backoff prevents server hammering
- Clear error messages on final failure

### 2. **State Update Pattern: Immutable Updates with Signals**

```typescript
// ❌ WRONG: Mutating signal value directly
this.memories().push(newMemory); // This won't trigger updates!

// ✅ CORRECT: Replace with new array
this.memories.update((current) => [...current, newMemory]);

// ✅ CORRECT: Replace array entirely
this.memories.set([...newMemories]);
```

**Critical rule:** Signals detect changes by **reference equality**, not deep comparison.

### 3. **Import/Export Conventions**

**Services:**

```typescript
// Always use inject() function, not constructor injection
import { inject } from '@angular/core';

export class MyService {
  private stateService = inject(StateService);
  // NOT: constructor(private stateService: StateService) {}
}
```

**Components:**

```typescript
// Always standalone, import dependencies explicitly
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, SharedComponent],
  template: `...`,
})
export class MyComponent {}
```

**Models:**

```typescript
// Single models.ts file for all interfaces
export interface Memory {
  id: string;
  filename: string;
  // ...
}

export interface YearSummary {
  year: number;
  total: number;
  // ...
}
```

### 4. **API Design Pattern: Service Methods**

**Naming convention:**

- Public methods: `camelCase`
- Private methods: `_camelCase` (leading underscore)

```typescript
export class DownloadService {
  // Public API
  startDownload(memories: readonly Memory[]): Promise<void> {
    // ...
  }

  // Private helpers
  private _validateBlob(blob: Blob): boolean {
    // ...
  }

  private _embedGpsData(memory: Memory, blob: Blob): Promise<Blob> {
    // ...
  }
}
```

### 5. **Async/Await Pattern: Always Use Try-Catch**

```typescript
// ✅ CORRECT: Proper error handling
async processMemory(memory: Memory): Promise<void> {
  try {
    const blob = await this.fetchWithRetry(memory.downloadUrl);

    if (!this._validateBlob(blob, memory.filename)) {
      throw new Error('Invalid blob');
    }

    this.zipper.addFile(memory, blob);
    this.stateService.updateMemory(memory.id, { status: 'completed' });

  } catch (error) {
    console.error(`Failed to process ${memory.filename}:`, error);
    this.stateService.updateMemory(memory.id, {
      status: 'failed',
      errorMessage: error.message
    });
  }
}
```

### 6. **Translation Pattern: Always Use Keys, Never Hardcode**

```typescript
// ❌ WRONG: Hardcoded English text
<h1>Download Your Memories</h1>

// ✅ CORRECT: Translation key
<h1>{{ translateService.get('download.title') }}</h1>
```

**Translation file structure:**

```json
{
  "download": {
    "title": "Download Your Memories",
    "button": "Start Download",
    "status": {
      "processing": "Processing {count} files...",
      "completed": "Download complete!"
    }
  }
}
```

### 7. **Type Safety Pattern: Readonly Arrays**

```typescript
// ✅ Use readonly for arrays that shouldn't be mutated
memories = signal<readonly Memory[]>([]);

// This prevents accidental mutations
this.memories().push(newMemory); // TypeScript error! ✅

// Forces you to use proper signal updates
this.memories.update((current) => [...current, newMemory]); // ✅
```

---

## Common Issues & Solutions

### Issue 1: "Link Expired" Error During Download

**Symptoms:**

- User uploads file successfully
- UI shows "⚠️ Link expired" message in red
- Download button disabled or shows warning

**Root Cause:**
Snapchat export links have expiration timestamps in URL query parameters. After expiration, download returns 403.

**Solution:**

1. **Check expiration date parsing:**

   ```typescript
   // In SnapParserService
   const expires = params.get('Expires');

   // IMPORTANT: Expires can be seconds OR milliseconds
   let expirationDate = new Date(parseInt(expires) * 1000);

   // Verify: If year < 2000, it must be milliseconds not seconds
   if (expirationDate.getFullYear() < 2000) {
     expirationDate = new Date(parseInt(expires));
   }
   ```

2. **Tell user to download fresh export:**
   - Go to Snapchat → Settings → My Data
   - Request new data export
   - Wait for email with fresh download link

**Prevention:**
Always parse and display expiration date to user upfront.

---

### Issue 2: Browser Crashes with Large Selections

**Symptoms:**

- Memory usage spikes
- Browser tab freezes
- "Out of memory" error in console

**Root Cause:**
Trying to create in-memory ZIP with too many files on browsers without streaming support (Firefox/Safari).

**Solution:**

1. **Check browser capabilities:**

   ```typescript
   if (!this.zipper.supportsStreamingZip()) {
     // Firefox/Safari: Force batching for 500+ files
     if (memoryCount > 500) {
       this.prepareBatches(memories);
     }
   }
   ```

2. **User action required:**
   - Tell user to switch to Chrome/Edge for unlimited downloads
   - OR download in smaller batches (by month/year)

**Quick fix:**
Enable `DEV_MODE` to test batching with just 10 files:

```typescript
// state.service.ts
const DEV_MODE = true; // Forces batching at 10 files
```

---

### Issue 3: Empty Files in Downloaded ZIP

**Symptoms:**

- ZIP downloads successfully
- Some files have 0 bytes
- No error messages during download

**Root Cause:**
Failed validation checks after download, but file still added to ZIP.

**Solution:**

Always validate before adding to ZIP:

```typescript
const isValid = this._validateBlob(fileBlob, memory.filename);

if (!isValid) {
  // Mark as failed, don't add to ZIP
  this.stateService.updateMemory(memory.id, { status: 'failed' });
  return; // Early exit
}

// Only add if valid
this.zipper.addFile(memory, fileBlob);
```

**Check validation logic:**

```typescript
_validateBlob(blob: Blob, filename: string): boolean {
  if (!blob || blob.size === 0) return false;

  const validMimes = ['image/jpeg', 'image/png', 'video/mp4'];
  if (!validMimes.includes(blob.type)) return false;

  return true;
}
```

---

### Issue 4: TypeScript Error: "Cannot mutate readonly array"

**Error Message:**

```
Property 'push' does not exist on type 'readonly Memory[]'
```

**Root Cause:**
Trying to mutate a Signal value directly.

**Solution:**

```typescript
// ❌ WRONG
this.memories().push(newMemory);

// ✅ CORRECT
this.memories.update((current) => [...current, newMemory]);
```

**Why:**
Signals use readonly arrays to enforce immutability and ensure change detection works.

---

### Issue 5: Translations Not Loading

**Symptoms:**

- UI shows translation keys instead of text (e.g., `download.title`)
- Console error: `Failed to fetch i18n/en.json`

**Root Cause:**
Translation JSON files not found in build output.

**Solution:**

1. **Check `angular.json` assets configuration:**

   ```json
   {
     "assets": [
       {
         "glob": "**/*",
         "input": "public"
       }
     ]
   }
   ```

2. **Verify file location:**

   ```
   public/i18n/en.json ✅
   src/i18n/en.json ❌ (wrong location)
   ```

3. **Check file naming:**
   - Must match language code exactly: `en.json`, `ar.json`, `es.json`
   - No prefixes: `lang-en.json` ❌

---

### Issue 6: Build Fails with "Budget Exceeded" Warning

**Error Message:**

```
Warning: bundle initial exceeded maximum budget
  initial: 1.2 MB (500 kB maximum warning)
```

**Root Cause:**
Bundle size exceeds configured budget in `angular.json`.

**Solution:**

**Option 1: Increase budget (if justified):**

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "800kB",
      "maximumError": "1.5MB"
    }
  ]
}
```

**Option 2: Analyze and optimize:**

```bash
# Generate build stats
ng build --stats-json

# Analyze bundle with webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/snaploader/browser/stats.json
```

**Common culprits:**

- `JSZip` (large library)
- `piexifjs` (legacy code)
- Unused imports

---

### Issue 7: GPS Coordinates Not Showing in Google Photos

**Symptoms:**

- JPEG files downloaded successfully
- No location data visible in Google Photos or Apple Photos

**Root Cause:**
EXIF embedding failed or coordinates formatted incorrectly.

**Solution:**

1. **Verify EXIF writing:**

   ```typescript
   const GPS_IFD = piexif.GPSIFD;
   const exifObj = {
     GPS: {
       [GPS_IFD.GPSLatitude]: this._degToDms(Math.abs(latitude)),
       [GPS_IFD.GPSLatitudeRef]: latitude >= 0 ? 'N' : 'S',
       [GPS_IFD.GPSLongitude]: this._degToDms(Math.abs(longitude)),
       [GPS_IFD.GPSLongitudeRef]: longitude >= 0 ? 'E' : 'W',
     },
   };
   ```

2. **Check DMS conversion:**

   ```typescript
   _degToDms(deg: number): [[number, number], [number, number], [number, number]] {
     const d = Math.floor(deg);
     const minFloat = (deg - d) * 60;
     const m = Math.floor(minFloat);
     const s = (minFloat - m) * 60;

     return [
       [d, 1],
       [m, 1],
       [Math.round(s * 100), 100] // Multiply by 100 for precision
     ];
   }
   ```

3. **Verify file type:**
   - Only works for JPEG/JPG
   - PNG/MP4 not supported

**Testing:**
Use ExifTool to verify:

```bash
exiftool downloaded-image.jpg | grep GPS
```

---

## Quick Reference

### Most-Used Commands

```bash
# Development
npm start                 # Start dev server (localhost:4200)
npm run build            # Production build
npm test                 # Run Vitest tests

# Angular CLI
ng serve                 # Same as npm start
ng build --configuration production
ng generate component my-component --standalone

# Dependency management
npm install              # Install all dependencies
npm update               # Update dependencies
npm outdated             # Check for outdated packages
```

### Important File Locations

| File/Directory                            | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `src/app/services/state.service.ts`       | Central state management              |
| `src/app/services/download.service.ts`    | File download and processing logic    |
| `src/app/services/zipper.service.ts`      | ZIP generation (streaming + fallback) |
| `src/app/services/geocoding.service.ts`   | Offline geocoding                     |
| `src/app/services/snap-parser.service.ts` | Snapchat HTML parsing                 |
| `src/app/models.ts`                       | All TypeScript interfaces             |
| `public/i18n/`                            | Translation JSON files                |
| `angular.json`                            | Build configuration                   |
| `tailwind.config.js`                      | Styling customization                 |

### Configuration Constants

**Enable dev mode for testing:**

```typescript
// src/app/services/state.service.ts
const DEV_MODE = true; // Lower threshold to 10 files
```

**Change batch size:**

```typescript
// src/app/services/state.service.ts
const PROD_LARGE_SELECTION_THRESHOLD = 300; // Default: 500
```

**Adjust retry behavior:**

```typescript
// src/app/services/download.service.ts
const MAX_RETRIES = 5; // Default: 3
const RETRY_DELAY_MS = 2000; // Default: 1000
```

**Modify memory limits:**

```typescript
// src/app/services/download.service.ts
const SOFT_MEMORY_LIMIT = 300 * 1024 * 1024; // Default: 400MB
const HARD_MEMORY_LIMIT = 500 * 1024 * 1024; // Default: 600MB
```

### External Resources and Documentation

**Technologies:**

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular Standalone Components](https://angular.dev/guide/components/importing)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)

**Key Libraries:**

- [JSZip Documentation](https://stuk.github.io/jszip/)
- [client-zip GitHub](https://github.com/Touffy/client-zip)
- [piexifjs GitHub](https://github.com/hMatoba/piexifjs)
- [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)

**Snapchat Data Export:**

- [How to Download Snapchat Data](https://support.snapchat.com/en-US/a/download-my-data)

**Deployment:**

- [Vercel Angular Deployment](https://vercel.com/docs/frameworks/angular)

---

## Final Notes for AI Assistants

### Critical Reminders

1. **Do NOT use constructor-based DI** → Always use `inject()` function
2. **Do NOT mutate Signal values directly** → Use `.set()` or `.update()`
3. **Do NOT hardcode text** → Always use `translateService.get(key)`
4. **Do NOT attempt MP4 GPS embedding** → It's impossible in browsers
5. **Do NOT forget to validate blobs** → Empty blobs = corrupt ZIPs
6. **Do NOT set `DEV_MODE = true` in production** → Always verify before deployment
7. **Do NOT use RxJS unless necessary** → Prefer Signals for state
8. **Do NOT create NgModules** → Everything is standalone
9. **Do NOT forget file validation** → Use `_validateBlob()` before adding to ZIP
10. **Do NOT assume direct file URLs** → Handle ZIP and JSON manifest formats

### When to Ask Questions

Ask the user for clarification when:

- Modifying core business logic (download flow, parsing, geocoding)
- Changing build configuration or dependencies
- Adding new external libraries
- Modifying translation keys or i18n structure
- Adjusting bundle budgets or performance settings

### When to Proceed Confidently

You can proceed without asking when:

- Fixing TypeScript errors related to strict mode
- Adding missing type annotations
- Refactoring to use Signals instead of manual change detection
- Improving error messages or logging
- Adding validation checks to prevent crashes
- Updating documentation or comments

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-15  
**Project Version:** 0.0.0  
**Built with:** Google Antigravity
