import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { AppService } from '../../services/app.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-year-for-country-summary',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './year-for-country-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearForCountrySummaryComponent {
  stateService = inject(StateService);
  appService = inject(AppService);

  isYearSelected(year: number): boolean {
    return this.stateService.selectedYearsForCountry().has(year);
  }

  get countryName(): string {
    const selection = this.stateService.selection();
    return typeof selection === 'string' ? selection : '';
  }
}
