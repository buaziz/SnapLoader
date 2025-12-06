# 📸 Snaploader

### 🚀 [**View the Live Demo Here**](https://snap-loader.vercel.app/)

<p align="center">
  <img alt="Angular" src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white">
</p>

A powerful, privacy-first web application to download, organize, and enrich your Snapchat memories. All processing happens directly in your browser, so your precious memories never leave your computer.

---

### 💡 Built with Google AI Studio

This entire app was brought to life using **[Google AI Studio](https://aistudio.google.com/)**! 🚀

It's an amazing in-browser IDE that lets you go from a simple idea to a fully functional web app super fast. If you've got a cool project in mind, you should totally check it out. You can code, test, and share your creations all from one place. Go build something awesome! ✨

---

## ✨ Features

- **🛡️ 100% Private & Secure**: All file parsing, data processing, and geocoding happens client-side. Your data is never uploaded to any server.
- **📁 Easy File Upload**: Upload your entire Snapchat data export `.zip` file directly. The app automatically finds and parses the `memories_history.html` file for you.
- **🌍 Automatic Geocoding**: Automatically converts GPS coordinates into country names using a 100% offline, privacy-preserving algorithm.
- **✍️ GPS Data Embedding**: For JPEG images, GPS coordinates are embedded directly into the file's EXIF metadata, making them compatible with photo apps like Google Photos or Apple Photos.
- **🧠 Smart Download History**: The app remembers your download progress in your browser's local storage. Previously downloaded years or months are automatically de-selected, making it easy to continue where you left off.
- **💪 Advanced Controls for Large Collections**: For selections with over 500 memories, the app provides powerful tools like drill-down filtering (by month or year) and user-controlled batching to ensure a smooth and reliable experience.
- **🤖 Intelligent Downloading**:
    - Handles Snapchat's complex download formats, including ZIP archives containing main images and overlays.
    - Automatically merges image overlays (filters, stickers) onto the main photo.
- **🌐 Multilingual Support**: Fully supports English, Arabic, French, Spanish, Chinese, Hindi, and Bengali, including RTL layouts.
- **🗂️ Organized ZIP Archives**: Downloads a single, neatly organized `.zip` file with your memories sorted into folders. The structure can even be `COUNTRY/YEAR/` for specific filtered downloads.

---

## 🗂️ Advanced Controls for Large Collections (500+ Memories)

If you're a heavy Snapchat user with thousands of memories, Snaploader has you covered. Special features automatically activate when you select a year or country containing more than 500 memories to give you more control and a much more reliable download experience.

### 1. Drill-Down Filtering

Instead of downloading a massive, unwieldy archive, the app allows you to get more specific.

- **🗓️ Filter a Large Year by Month**: If you select a year with 500+ memories, a new screen will appear, allowing you to select or de-select specific **months** within that year.
- **🌍 Filter a Large Country by Year**: If you select a country with 500+ memories, you can then choose to download only specific **years** from that country.
  - **✨ Special Folder Structure**: When using this filter, your ZIP archive will be neatly organized with a `COUNTRY/YEAR/` folder structure (e.g., `/United-States/2023/memory.jpg`).

### 2. Smart Download History & Pre-selection

Snaploader is designed for multi-session use. You don't have to download everything in one go.

- **✅ Progress is Saved**: The app uses your browser's local storage to keep a secure, private record of every memory file that was successfully downloaded or failed.
- **🔄 Automatic Reset**: This history is intelligently tied to both the app version and the specific `memories_history.html` file you upload. If you upload a new data export from Snapchat or if the app updates, the history resets to prevent conflicts.
- **💡 Smart Pre-selection**: When you use the drill-down filtering, the app checks your history. Any months or years that you have **already fully downloaded** will be **de-selected by default**, with a small note showing their status. This makes it incredibly easy to pick up where you left off and only download what's new or what failed last time.

### 3. Reliable Batch Processing

Even after filtering, your selection might still be very large. The app's user-controlled batching system (which also activates for selections over 500 memories) splits the download into multiple smaller ZIP files, preventing browser crashes and ensuring a successful result.

---

## ⚙️ How It Works

This application is a modern, zoneless Angular web app built with performance and user experience in mind.

### Core Architecture

- **Frontend**: Built with **Angular** using standalone components and **Signals** for reactive state management. Styling is done with **Tailwind CSS**.
- **State Management (`StateService` & `LocalStorageService`)**:
    - The `StateService` holds the application's live state in Signals (memories, UI status, user selections). `computed()` signals derive state like yearly/country summaries, making the UI highly reactive and efficient.
    - The `LocalStorageService` manages persistent state between sessions. It saves a history of downloaded and failed files to the browser's local storage, enabling the "smart pre-selection" feature. This history is versioned and tied to the user's specific data file to prevent conflicts.

### The Processing Pipeline

1.  **Parsing (`SnapParserService` & `AppService`)**:
    - When a user uploads their Snapchat export, the app first checks if it's a `.zip` file.
    - If it is, it uses `JSZip` to scan the archive for the `memories_history.html` file.
    - The service uses the browser's native `DOMParser` to read the memory data table, extracting the date, media type, location, and download URLs.
    - It also cleverly determines the link expiration date from the download URLs.

2.  **Geocoding (`GeocodingService`)**:
    - **Offline & Private**: It uses an offline, in-browser approach. No external API calls are made to determine locations, ensuring 100% privacy.
    - On first use, the app downloads a lightweight GeoJSON file containing the world's country borders. For each memory's GPS coordinate, it performs a fast "point-in-polygon" check locally to find the matching country.

3.  **Downloading & Processing (`DownloadService`)**:
    - **Concurrent Downloads**: Manages a queue to download multiple files simultaneously for speed.
    - **Resilient Processing**: Includes a robust retry mechanism and gracefully handles errors with individual files (e.g., a corrupt sticker overlay) without crashing the entire batch.
    - **Format Handling**: It intelligently handles three primary download types from Snapchat:
        1.  **Direct File**: A direct link to a `.jpg` or `.mp4`.
        2.  **ZIP Archive**: A link to a `.zip` file containing a `main.jpg` and an `overlay.png`. The service unzips this in-memory and merges the overlay onto the main image using the **Canvas API**.
        3.  **JSON Manifest**: A link to a `.json` file that contains the *actual* URLs for the media and overlay files.
    - **Metadata Embedding**: For JPEG images, it uses `piexifjs` to write GPS and date information directly into the EXIF headers.

4.  **Zipping (`ZipperService`)**:
    - Uses `JSZip` to create a `.zip` archive in the browser's memory.
    - The folder structure inside the ZIP is determined by this service based on the user's selection (e.g., `/2024/United-States/` or `/United-States/2024/`).
    - Once complete, it generates a Blob and uses `FileSaver.js` to trigger the download prompt.

---

## 🚀 Running Locally

To run the project locally, you'll need Node.js and the Angular CLI installed.

```bash
# 1. Install project dependencies
npm install

# 2. Start the local development server
npm start
```

Now, open your browser and navigate to `http://localhost:4200/`.

---

## 🧪 Testing & Development

### Forcing Advanced Features

The advanced features for large collections (batching, drill-down filtering) are critical but hard to test without a huge memories file. To make this easy, a developer mode is built-in.

1.  **Open the State Service**:
    - Navigate to and open the file `src/services/state.service.ts`.

2.  **Enable `DEV_MODE`**:
    - Near the top of the file, find the `DEV_MODE` constant and set it to `true`.

    ```typescript
    // --- Developer Mode Configuration ---
    // Set to `true` to force a smaller batch size for easy testing.
    const DEV_MODE = true; // Set this to true
    const DEV_BATCH_SIZE = 10;
    // ------------------------------------
    ```

3.  **Test in the App**:
    - With `DEV_MODE` enabled, the "large selection" threshold is lowered to just **10 memories**.
    - Now you can upload any memories file, select a year or country with more than 10 memories, and the app will trigger the full "500+" user experience, including drill-down filtering and batch processing.

**Remember to set `DEV_MODE` back to `false` before deploying to production!**

---

## 🌍 Adding a New Language

Adding a new language is simple, as all translations are stored directly inside the application.

1.  **Open the Translation Service**:
    - Navigate to and open the file `src/services/translate.service.ts`.

2.  **Add Your Language Data**:
    - Find the `_translationData` constant. Add a new key for your language (e.g., `"de"` for German), copy the English block, and translate the values.

    ```typescript
    const _translationData: Readonly<Record<string, Record<string, string>>> = {
      en: { /* ... */ },
      ar: { /* ... */ },
      // Add your new language block here!
      de: {
        "APP_TITLE": "Dein Titel", // <-- Translate this
        // ... translate all other keys
      }
    };
    ```

3.  **Register the Language**:
    - Find the `AVAILABLE_LANGUAGES` constant array and add an entry for your language.

    ```typescript
    const AVAILABLE_LANGUAGES: readonly Language[] = [
      { code: 'en', name: 'English', dir: 'ltr' },
      { code: 'ar', name: 'عربي', dir: 'rtl' },
      // Add your new language here!
      { code: 'de', name: 'Deutsch', dir: 'ltr' }, 
    ];
    ```

That's it! The language selector will automatically update to show the new option.