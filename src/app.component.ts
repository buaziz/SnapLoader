import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AppService } from './services/app.service';
import { StateService } from './services/state.service';
import { TranslateService } from './services/translate.service';
import { TranslatePipe } from './app/pipes/translate.pipe';

import { HeaderComponent } from './app/components/header/header.component';
import { FileUploadComponent } from './app/components/file-upload/file-upload.component';
import { DownloadCompleteComponent } from './app/components/download-complete/download-complete.component';
import { ErrorDisplayComponent } from './app/components/error-display/error-display.component';
import { DownloadProgressComponent } from './app/components/download-progress/download-progress.component';
import { YearSummaryComponent } from './app/components/year-summary/year-summary.component';
import { CountrySummaryComponent } from './app/components/country-summary/country-summary.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FileUploadComponent,
    DownloadCompleteComponent,
    ErrorDisplayComponent,
    DownloadProgressComponent,
    YearSummaryComponent,
    CountrySummaryComponent,
    TranslatePipe
  ]
})
export class AppComponent implements OnInit {
  // This application is a client-side utility and does not require authentication.
  // The main UI is designed to be immediately accessible to all visitors.
  appService = inject(AppService);
  stateService = inject(StateService);
  translateService = inject(TranslateService);

  constructor() {
    effect(() => {
      // Update page direction and language attribute for accessibility
      document.documentElement.lang = this.translateService.currentLang();
      document.documentElement.dir = this.translateService.direction();
      // Update browser tab title reactively
      document.title = this.translateService.get('APP_TITLE');
    });
  }

  ngOnInit() {
    // With inline translations, initialization is synchronous and cannot fail.
    // The complex async logic with timeouts is no longer needed.
    const startTime = performance.now();
    console.log('🚀 Starting translation service initialization...');
    
    this.translateService.initialize('en'); // Default language
    
    console.log('✅ Translation service initialized successfully.');
    const duration = Math.round(performance.now() - startTime);
    console.log(`🎉 App initialization complete in ${duration}ms`);
  }
}
