import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { AppService } from '../../services/app.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Batch } from '../../models';

@Component({
  selector: 'app-batch-control',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './batch-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchControlComponent {
  stateService = inject(StateService);
  appService = inject(AppService);

  // --- Computed properties for UI logic ---
  successfulBatches = computed(() => this.stateService.batches().filter(b => b.status === 'success'));
  plannedBatches = computed(() => this.stateService.batches().filter(b => b.status === 'planned'));
  isAnyProcessing = computed(() => this.stateService.batches().some(b => b.status === 'processing'));

  // --- Actions ---
  process(batch: Batch): void {
    if (batch.status === 'planned' || batch.status === 'error') {
      this.appService.processBatch(batch);
    }
  }

  processAll(): void {
    this.appService.processAllBatches();
  }

  download(batch: Batch): void {
    this.appService.downloadProcessedBatch(batch);
  }

  downloadAll(): void {
    this.appService.downloadAllSuccessfulBatches();
  }

  startOver(): void {
    this.appService.resetForNewDownload();
  }
}