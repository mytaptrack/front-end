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

AuthClientService.setEnvironment(environment);

const routes: Routes = [
  { path: '', component: ConsoleComponent },
  { path: 'apps', component: DeviceManagementComponent },
  { path: 'templates', component: TemplatesComponent },
  { path: 'templates/behaviors', component: TemplatesComponent },
  { path: 'program/report', component: ProgramReportComponent},
  { path: 'download', component: ManageDownloadDataComponent},
  { path: 'abc', component: AbcManagerComponent },
  { path: 'students', component: ManageStudentsComponent },
  { path: 'tags', component: TagManagementComponent },
  { path: 'license', component: LicenseComponent },
  { path: '**', component: ConsoleComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
