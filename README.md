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
- **📁 Easy File Upload**: Upload your entire Snapchat data export `.zip` file directly. The app automatically finds and parses the `memories_history.html` file for you. No need to unzip it first!
- **🌍 Automatic Geocoding**: Automatically converts GPS coordinates from your memories into country names, allowing you to see where you've been.
- **📅 Smart Organization**: Choose to group and download your memories by the **year** they were taken or the **country** they were in.
- **✍️ GPS Data Embedding**: For JPEG images, GPS coordinates are embedded directly into the file's EXIF metadata, making them compatible with photo apps like Google Photos or Apple Photos.
- **💪 User-Controlled Batching**: For large selections (over 500 memories), the app presents a batch control screen. You can process each smaller ZIP file individually or all at once, giving you full control over your browser's memory usage and preventing crashes.
- **🤖 Intelligent Downloading**:
    - Handles Snapchat's complex download formats, including ZIP archives containing main images and overlays.
    - Automatically merges image overlays (filters, stickers) onto the main photo.
- **🌐 Multilingual Support**: The interface is available in English, Arabic, French, Spanish, Chinese, Hindi, and Bengali, with RTL support. It's also easy to [add your own language](#-adding-a-new-language)!
- **🗂️ All-in-One ZIP**: Downloads a single, neatly organized `.zip` file with your selected memories sorted into folders (unless batching is required).

---

## ⚙️ How It Works

This application is a modern, zoneless Angular web app built with performance and user experience in mind.

### Core Architecture

- **Frontend**: Built with **Angular** using standalone components and **Signals** for reactive state management. Styling is done with **Tailwind CSS**.
- **State Management (`StateService`)**: A central service (`StateService.ts`) holds the application's state in Signals. This includes the list of memories, UI status, user selections, and download progress. `computed()` signals derive state like yearly/country summaries, making the UI highly reactive and efficient.

### The Processing Pipeline

1.  **Parsing (`SnapParserService` & `AppService`)**:
    - When a user uploads their Snapchat export, the app first checks if it's a `.zip` file.
    - If it is, it uses `JSZip` to scan the archive for the `memories_history.html` file, no matter which subfolder it's in.
    - Once the HTML content is extracted (either from the zip or a direct HTML upload), the service uses the browser's native `DOMParser` to read the memory data table.
    - It extracts the date, media type, location coordinates, and download URLs for each memory.
    - It cleverly determines the link expiration date from the download URLs.

2.  **Geocoding (`GeocodingService`)**:
    - This service resolves GPS coordinates to country names **without a backend**.
    - **Offline & Private**: It uses an offline, in-browser approach. No external API calls are made to determine locations, ensuring 100% privacy.
    - **How it Works**:
        - On first use, the app downloads a lightweight GeoJSON file containing the world's country borders.
        - For each memory's GPS coordinate, it performs a fast "point-in-polygon" check locally in your browser to find the matching country.
        - The GeoJSON data is cached by the browser, so subsequent uses are instantaneous.
    - **No Rate Limits, No API Keys**: This offline method is extremely fast and has no usage limits.

3.  **Downloading & Processing (`DownloadService`)**:
    - **Concurrent Downloads**: Manages a queue to download multiple files simultaneously (defaulting to 5 workers) for speed.
    - **Batch Processing**: For large selections, the app no longer processes everything at once. Instead, it transitions to a **Batch Control** screen. Here, the download is pre-calculated and split into manageable parts. The user can then choose to process each part individually or all at once. This user-driven approach prevents the browser from being overwhelmed by creating multiple large ZIP files in memory simultaneously, ensuring a stable experience even with tens of thousands of memories.
    - **Resilient Fetching**: Includes a retry mechanism with exponential backoff to handle transient network errors.
    - **Format Handling**: It intelligently handles three primary download types from Snapchat:
        1.  **Direct File**: A direct link to a `.jpg` or `.mp4`.
        2.  **ZIP Archive**: A link to a `.zip` file containing a `main.jpg` and an `overlay.png`. The service unzips this in-memory, merges the overlay onto the main image using the **Canvas API**, and proceeds with the result.
        3.  **JSON Manifest**: A link to a `.json` file that contains the *actual* URLs for the media and overlay files.
    - **Metadata Embedding**:
        - For JPEG images, it uses `piexifjs` to write GPS and date information directly into the EXIF headers.
        - Videos and other image formats (PNG, HEIC, etc.) are added to the ZIP archive without embedded location data.

4.  **Zipping (`ZipperService`)**:
    - Uses `JSZip` to create a `.zip` archive in the browser's memory.
    - Files are added one by one as they are downloaded and processed.
    - The final folder structure inside the ZIP (`/2024/United States/`) is determined by this service based on the user's selection.
    - Once complete, it generates a Blob and uses `FileSaver.js` to trigger the download prompt for the user.

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

### Forcing Batch Download Mode

The batch download feature is a critical part of the app's stability, but testing it normally would require a `memories_history.html` file with over 500 entries. To make this easier, a simple developer mode is built-in.

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
    - With `DEV_MODE` enabled, the batching threshold is lowered to just **10 memories**.
    - Now you can upload any memories file, select a year or country with more than 10 memories, and the app will trigger the full batch download UI and logic, creating multiple smaller ZIP files.

**Remember to set `DEV_MODE` back to `false` before deploying to production!**

---

## 🌍 Adding a New Language

Adding a new language is simple, as all translations are now stored directly inside the application for maximum reliability and speed.

1.  **Open the Translation Service**:
    - Navigate to and open the file `src/services/translate.service.ts`.

2.  **Add Your Language Data**:
    - Find the `_translationData` constant near the top of the file.
    - Add a new key for your language (e.g., `"fr"` for French).
    - Copy the contents of the `"en"` block, paste it under your new key, and translate all the string values.

    ```typescript
    const _translationData: Readonly<Record<string, Record<string, string>>> = {
      en: {
        "HEADER_TITLE_PART_1": "Buaziz",
        // ... more english translations
      },
      ar: {
        "HEADER_TITLE_PART_1": "بوعزيز",
        // ... more arabic translations
      },
      // Add your new language block here!
      fr: {
        "HEADER_TITLE_PART_1": "Buaziz", // <-- Translate this
        "HEADER_TITLE_PART_2": "SnapLoader", // <-- Translate this
        // ... translate all other keys
      }
    };
    ```

3.  **Register the Language**:
    - Just below the data, find the `AVAILABLE_LANGUAGES` constant array.
    - Add a new entry for your language. Make sure to set the correct name and text direction (`dir`).

    ```typescript
    const AVAILABLE_LANGUAGES: readonly Language[] = [
      { code: 'en', name: 'English', dir: 'ltr' },
      { code: 'ar', name: 'عربي', dir: 'rtl' },
      // Add your new language here!
      { code: 'fr', name: 'Français', dir: 'ltr' }, 
    ];
    ```

That's it! The language selector will automatically update to show the new option. No external files are needed.