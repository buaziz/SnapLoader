import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { AppService } from '../../services/app.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-month-summary',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './month-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthSummaryComponent {
  stateService = inject(StateService);
  appService = inject(AppService);

  // This provides a type-safe value for the template. We know `selection()`
  // will be a number when this component is active.
  selectedYear = computed(() => this.stateService.selection() as number);

  isMonthSelected(month: number): boolean {
    return this.stateService.selectedMonths().has(month);
  }
}