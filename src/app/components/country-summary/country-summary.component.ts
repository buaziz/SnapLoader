import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CountrySummary } from '../../models';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-country-summary',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="bg-snap-dark p-4 rounded-2xl border border-snap-gray mb-8">
      <h3 class="font-bold text-snap-yellow mb-3 text-lg">{{ 'COUNTRY_SELECT_TITLE' | translate }}</h3>
      <div class="max-h-64 overflow-y-auto pr-2">
        <!-- Header -->
        <div class="flex items-center border-b border-snap-gray font-semibold px-2 py-1 text-sm">
          <div class="w-8 flex-shrink-0"></div>
          <div class="flex-grow">{{ 'COUNTRY_TABLE_HEADER_COUNTRY' | translate }}</div>
          <div class="w-20 text-end flex-shrink-0">{{ 'COUNTRY_TABLE_HEADER_TOTAL' | translate }}</div>
        </div>
        <!-- Items -->
        <div>
            @for (item of summary(); track item.country) {
            <div class="flex items-center border-b border-snap-gray last:border-b-0 hover:bg-snap-gray/50 cursor-pointer" (click)="countrySelected.emit(item.country)">
              <div class="p-2 w-10 flex-shrink-0"><input type="radio" name="selection" class="h-5 w-5 bg-snap-gray border-snap-dark rounded-full text-snap-yellow focus:ring-snap-yellow focus:ring-2" [checked]="selection() === item.country" (change)="countrySelected.emit(item.country)" (click)="$event.stopPropagation()"></div>
              <div class="p-2 flex-grow truncate" [class]="{ 'text-zinc-500': item.status === 'no-data', 'text-orange-400': item.status === 'unidentified' }">{{ item.country | translate }}</div>
              <div class="p-2 w-20 flex-shrink-0 text-end font-mono font-bold">{{ item.total }}</div>
            </div>
            } @empty {
              <div class="p-4 text-center text-zinc-400">{{ 'COUNTRY_NO_LOCATIONS' | translate }}</div>
            }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountrySummaryComponent {
  summary = input.required<CountrySummary[]>();
  selection = input<number | string | null>();
  countrySelected = output<string>();
}