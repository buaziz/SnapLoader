import { ChangeDetectionStrategy, Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-download-progress',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './download-progress.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadProgressComponent {
  stateService = inject(StateService);
  cancel = output<void>();
}
