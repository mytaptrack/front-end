import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsComponent } from './components/student/settings/settings.component';
import { CreateComponent } from './components/student/create/create.component';
import { ProfileComponent } from './components/user/profile/profile.component';
import { SetupComponent } from './components/user/setup/setup.component';
import { ForgotpasswordComponent } from './components/user/forgotpassword/forgotpassword.component';
import { Dashboard2Component } from './components/student/dashboard2/dashboard2.component';
import { TrackingComponent } from './components/student/tracking/tracking.component';
import { DashboardMobileComponent } from './components/student/dashboard-mobile/dashboard-mobile.component';
import { DownloadComponent } from './components/student/download/download.component';
import { SnapshotComponent } from './components/student/snapshot/snapshot.component';
import { PrintComponent } from './components/student/print/print.component';
import { CompareTrackingComponent } from './components/student/tracking/compare-tracking/compare-tracking.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: Dashboard2Component, canDeactivate: [(component: Dashboard2Component) => {
    if(!component.hasUnsavedChanges) {
      return true;
    }
    if(confirm("There are unsaved changed, do you wish to navigate away?")) {
      return true;
    }
    return false;
  }] },
  { path: 'mobile', pathMatch: 'full', component: DashboardMobileComponent },
  { path: 'dashboard', component: Dashboard2Component, canDeactivate: [(component: Dashboard2Component) => {
    if(!component.hasUnsavedChanges || confirm("There are unsaved changed, do you wish to navigate away?")) {
      return true;
    }
    return false;
  }] },
  { path: 'student/tracking', component: TrackingComponent },
  { path: 'student/tracking/compare', component: CompareTrackingComponent },
  { path: 'student/settings', component: SettingsComponent },
  { path: 'student/settings/:tabName', component: SettingsComponent },
  { path: 'student/create', component: CreateComponent },
  { path: 'student/download', component: DownloadComponent },
  { path: 'student/snapshot', component: SnapshotComponent},
  { path: 'student/print', component: PrintComponent},
  { path: 'profile', component: ProfileComponent },
  { path: 'setup', component: SetupComponent },
  { path: 'forgotPassword', component: ForgotpasswordComponent },
  { path: '**', component: Dashboard2Component }
];

@NgModule({
  imports: [RouterModule.forRoot(routes,
    { anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
