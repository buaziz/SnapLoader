import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YearSummary } from '../../models';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-year-summary',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-snap-dark p-4 rounded-2xl border border-snap-gray mb-8">
      <h3 class="font-bold text-snap-yellow mb-3 text-lg">{{ 'YEAR_SELECT_TITLE' | translate }}</h3>
      <div class="max-h-64 overflow-y-auto pr-2">
          <table class="w-full text-start">
            <thead>
              <tr class="border-b border-snap-gray text-sm sm:text-base">
                <th class="px-1 py-2 sm:p-2 w-10"></th>
                <th class="px-1 py-2 sm:p-2 font-semibold">{{ 'YEAR_TABLE_HEADER_YEAR' | translate }}</th>
                <th class="px-1 py-2 sm:p-2 font-semibold text-end">{{ 'YEAR_TABLE_HEADER_PHOTOS' | translate }}</th>
                <th class="px-1 py-2 sm:p-2 font-semibold text-end">{{ 'YEAR_TABLE_HEADER_VIDEOS' | translate }}</th>
                <th class="px-1 py-2 sm:p-2 font-semibold text-end">{{ 'YEAR_TABLE_HEADER_TOTAL' | translate }}</th>
              </tr>
            </thead>
            <tbody>
            @for (item of summary(); track item.year) {
              <tr class="border-b border-snap-gray last:border-b-0 hover:bg-snap-gray/50 cursor-pointer" (click)="yearSelected.emit(item.year)">
                <td class="px-1 py-2 sm:p-2"><input type="radio" name="selection" class="h-5 w-5 bg-snap-gray border-snap-dark rounded-full text-snap-yellow focus:ring-snap-yellow focus:ring-2" [checked]="selection() === item.year" (change)="yearSelected.emit(item.year)" (click)="$event.stopPropagation()"></td>
                <td class="px-1 py-2 sm:p-2 font-mono text-base sm:text-lg">{{ item.year }}</td>
                <td class="px-1 py-2 sm:p-2 text-end font-mono">{{ item.images }}</td>
                <td class="px-1 py-2 sm:p-2 text-end font-mono">{{ item.videos }}</td>
                <td class="px-1 py-2 sm:p-2 text-end font-bold font-mono">{{ item.total }}</td>
              </tr>
            }
            </tbody>
          </table>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearSummaryComponent {
  summary = input.required<YearSummary[]>();
  selection = input<number | string | null>();
  yearSelected = output<number>();
}