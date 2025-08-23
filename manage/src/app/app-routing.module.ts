import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsoleComponent } from './components/console/console.component';
import { DeviceManagementComponent } from './components/device-management/device-management.component';
import { TemplatesComponent } from './components/templates/templates.component';
import { AbcManagerComponent } from './components/abc-manager/abc-manager.component';
import { ManageDownloadDataComponent } from './components/download-data/download-data.component';
import { ProgramReportComponent } from './components/program-report/program-report.component';
import { ManageStudentsComponent } from './components/students/students.component';
import { TagManagementComponent } from './components/tag-management/tag-management.component';
import { AuthClientService } from './services';
import { environment } from 'src/environments/environment';
import { LicenseComponent } from './components/license/license.component';
import { UserSetupComponent } from './components/user-setup/user-setup.component';
import { UserSetupGuard } from './guards/user-setup.guard';

AuthClientService.setEnvironment(environment);

const routes: Routes = [
  { path: '', component: ConsoleComponent, canActivate: [UserSetupGuard] },
  { path: 'setup', component: UserSetupComponent },
  { path: 'apps', component: DeviceManagementComponent, canActivate: [UserSetupGuard] },
  { path: 'templates', component: TemplatesComponent, canActivate: [UserSetupGuard] },
  { path: 'templates/behaviors', component: TemplatesComponent, canActivate: [UserSetupGuard] },
  { path: 'program/report', component: ProgramReportComponent, canActivate: [UserSetupGuard] },
  { path: 'download', component: ManageDownloadDataComponent, canActivate: [UserSetupGuard] },
  { path: 'abc', component: AbcManagerComponent, canActivate: [UserSetupGuard] },
  { path: 'students', component: ManageStudentsComponent, canActivate: [UserSetupGuard] },
  { path: 'tags', component: TagManagementComponent, canActivate: [UserSetupGuard] },
  { path: 'license', component: LicenseComponent, canActivate: [UserSetupGuard] },
  { path: '**', component: ConsoleComponent, canActivate: [UserSetupGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
