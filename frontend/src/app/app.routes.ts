import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LettureComponent } from './letture/letture.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'letture', component: LettureComponent },
  { path: '**', redirectTo: '' },
];
