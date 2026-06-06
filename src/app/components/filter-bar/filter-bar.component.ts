import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FilterState } from '../../core/models/device-status.model';
import { LucideAngularModule, Filter, AlertTriangle, Cpu } from 'lucide-angular';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './filter-bar.component.html',
})
export class FilterBarComponent {
  @Input() filter!: FilterState;
  @Output() filterChange = new EventEmitter<Partial<FilterState>>();

  onRepartoChange(event: Event): void {
    this.filterChange.emit({ reparto: (event.target as HTMLSelectElement).value });
  }

  onStatusChange(event: Event): void {
    this.filterChange.emit({ status: (event.target as HTMLSelectElement).value });
  }

  onTypeChange(event: Event): void {
    this.filterChange.emit({ deviceType: (event.target as HTMLSelectElement).value });
  }
}
