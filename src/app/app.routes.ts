import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { BloomDashboardComponent } from './bloom-dashboard/bloom-dashboard.component';
import { ConselhoComponent } from './bloom-dashboard/sections/conselho/conselho.component';
import { DividasComponent } from './bloom-dashboard/sections/dividas/dividas.component';
import { EmergenciaComponent } from './bloom-dashboard/sections/emergencia/emergencia.component';
import { FinancasComponent } from './bloom-dashboard/sections/financas/financas.component';
import { HistoricoComponent } from './bloom-dashboard/sections/historico/historico.component';
import { LembretesComponent } from './bloom-dashboard/sections/lembretes/lembretes.component';
import { OverviewComponent } from './bloom-dashboard/sections/overview/overview.component';
import { ParcelasComponent } from './bloom-dashboard/sections/parcelas/parcelas.component';
import { SonhosComponent } from './bloom-dashboard/sections/sonhos/sonhos.component';
import { SuporteComponent } from './bloom-dashboard/sections/suporte/suporte.component';
import { TemasComponent } from './bloom-dashboard/sections/temas/temas.component';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent, canActivate: [guestGuard], data: { mode: 'login' } },
  { path: 'cadastro', component: AuthComponent, canActivate: [guestGuard], data: { mode: 'register' } },
  { path: 'recuperar-senha', component: AuthComponent, canActivate: [guestGuard], data: { mode: 'recover' } },
  {
    path: '',
    component: BloomDashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: OverviewComponent },
      { path: 'financas', component: FinancasComponent },
      { path: 'historico', component: HistoricoComponent },
      { path: 'parcelas', component: ParcelasComponent },
      { path: 'dividas', component: DividasComponent },
      { path: 'sonhos', component: SonhosComponent },
      { path: 'lembretes', component: LembretesComponent },
      { path: 'conselho', component: ConselhoComponent },
      { path: 'emergencia', component: EmergenciaComponent },
      { path: 'suporte', component: SuporteComponent },
      { path: 'temas', component: TemasComponent },
    ],
  },
  { path: '**', redirectTo: '' },
];
