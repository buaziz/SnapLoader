import { Injectable, inject } from '@angular/core';
import { Batch, Memory } from '../models';
import { StateService } from './state.service';
import { TranslateService } from './translate.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private stateService = inject(StateService);
  private translateService = inject(TranslateService);

  generateReportHtml(batch: Batch, successfulMemories: Memory[], failedMemories: Memory[]): string {
    const currentLang = this.translateService.currentLang();
    const lang = ['en', 'ar'].includes(currentLang) ? currentLang : 'en';
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    const reportDate = new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');
    
    // --- Translated Content ---
    const reportTitle = this.translateService.get('REPORT_TITLE');
    const batchInfo = this.translateService.get('REPORT_BATCH_INFO', { 
        batchNum: batch.batchNum, 
        totalBatches: batch.totalBatches, 
        date: reportDate 
    });
    const statTotal = this.translateService.get('REPORT_STAT_TOTAL');
    const statSuccessful = this.translateService.get('REPORT_STAT_SUCCESSFUL');
    const statFailed = this.translateService.get('REPORT_STAT_FAILED');
    const failedTitle = this.translateService.get('REPORT_FAILED_MEMORIES_TITLE', { count: failedMemories.length });
    const failedSubtitle = this.translateService.get('REPORT_FAILED_MEMORIES_SUBTITLE');
    const footerText = this.translateService.get('REPORT_FOOTER_TEXT');
    const footerLink = this.translateService.get('REPORT_FOOTER_LINK');

    // --- Dynamic Content ---
    const totalCount = batch.memories.length;
    const successCount = successfulMemories.length;
    const failedCount = failedMemories.length;

    const failedFilesList = failedMemories.map(mem => `<li>${this.escapeHtml(mem.filename)}</li>`).join('');

    return `
      <!DOCTYPE html>
      <html lang="${lang}" dir="${dir}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
              body {
                  font-family: 'Poppins', sans-serif;
                  background-color: #1E1E1E;
                  color: #FFFFFF;
                  margin: 0;
                  padding: 2rem;
                  -webkit-font-smoothing: antialiased;
                  -moz-osx-font-smoothing: grayscale;
                  direction: ${dir};
              }
              .container {
                  max-width: 800px;
                  margin: 0 auto;
                  background-color: #3A3A3A;
                  border-radius: 1.5rem;
                  padding: 2rem;
                  border: 1px solid rgba(0,0,0,0.5);
                  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              }
              header, .stat-card, footer {
                  text-align: center;
              }
              header h1 {
                  font-size: 2.25rem;
                  font-weight: 700;
                  margin: 0;
                  color: #FFFFFF;
              }
              header h1 span {
                  color: #FFFC00;
              }
              header p {
                  font-size: 1rem;
                  color: #A0A0A0;
                  margin: 0.5rem 0 0;
              }
              .stats-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 1rem;
                  margin-bottom: 2rem;
              }
              .stat-card {
                  background-color: #1E1E1E;
                  padding: 1.5rem;
                  border-radius: 1rem;
              }
              .stat-card .value {
                  font-size: 2.5rem;
                  font-weight: 700;
                  line-height: 1;
              }
              .stat-card .label {
                  font-size: 0.875rem;
                  text-transform: uppercase;
                  color: #A0A0A0;
                  margin-top: 0.5rem;
              }
              .success { color: #4ade80; }
              .fail { color: #f87171; }
              .total { color: #FFFFFF; }
              .file-list-container {
                  background-color: #1E1E1E;
                  border-radius: 1rem;
                  padding: 1.5rem;
              }
              .file-list-container h2 {
                  font-size: 1.5rem;
                  font-weight: 600;
                  margin-top: 0;
                  margin-bottom: 0.5rem;
                  color: #FFFC00;
              }
              .file-list-container .subtitle {
                  font-size: 0.9rem;
                  color: #A0A0A0;
                  margin-top: 0;
                  margin-bottom: 1rem;
              }
              .file-list {
                  list-style-type: none;
                  padding: 0;
                  margin: 0;
                  max-height: 300px;
                  overflow-y: auto;
              }
              .file-list li {
                  font-family: monospace;
                  font-size: 0.875rem;
                  padding: 0.5rem 0.75rem;
                  border-bottom: 1px solid #3A3A3A;
                  word-break: break-all;
                  background-color: #2a2a2a;
              }
               [dir="ltr"] .file-list li { text-align: left; }
               [dir="rtl"] .file-list li { text-align: right; }

              .file-list li:nth-child(odd) {
                  background-color: transparent;
              }
              .file-list li:last-child {
                  border-bottom: none;
              }
              footer {
                  padding-top: 1.5rem;
                  margin-top: 1.5rem;
                  border-top: 1px solid #1E1E1E;
                  font-size: 0.875rem;
                  color: #71717a;
              }
              footer a {
                  color: #FFFC00;
                  text-decoration: none;
              }
              footer a:hover {
                  text-decoration: underline;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <header>
                  <h1>👻 <span>Snaploader</span> Report</h1>
                  <p>${batchInfo}</p>
              </header>
              <main>
                  <div class="stats-grid">
                      <div class="stat-card">
                          <div class="value total">${totalCount}</div>
                          <div class="label">${statTotal}</div>
                      </div>
                      <div class="stat-card">
                          <div class="value success">${successCount}</div>
                          <div class="label">${statSuccessful}</div>
                      </div>
                      <div class="stat-card">
                          <div class="value fail">${failedCount}</div>
                          <div class="label">${statFailed}</div>
                      </div>
                  </div>
                  <div class="file-list-container">
                      <h2>${failedTitle}</h2>
                      <p class="subtitle">${failedSubtitle}</p>
                      <ul class="file-list">${failedFilesList}</ul>
                  </div>
              </main>
              <footer>
                  <p>${footerText}<a href="https://snap-loader.vercel.app/" target="_blank">${footerLink}</a></p>
              </footer>
          </div>
      </body>
      </html>
    `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }
}