import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { AbcManagerComponent } from './components/abc-manager/abc-manager.component';
import { ConsoleComponent } from './components/console/console.component';
import { DeviceManagementComponent } from './components/device-management/device-management.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgChartsModule } from 'ng2-charts';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, MatDateSelectionModel } from '@angular/material/datepicker';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';

import { MttTagsComponent } from './components/mtt-tags/mtt-tags.component';
import { TagManagementComponent } from './components/tag-management/tag-management.component';
import { AuthClientService } from './services';
import { ApiClientService, ChartUtilsService, DateTimeService, ErrorHandlingService, UserService, ViewerConfigService } from './services';
import { EditDropdownComponent, TimeInputComponent } from './lib';
import { ManageStudentsComponent } from './components/students/students.component';
import { ManageDownloadDataComponent } from './components/download-data/download-data.component';
import { DeviceAppComponent } from './components/device-management/app/app.component';
import { AbcCollectionComponent } from './components/abc-manager/abc-collection/abc-collection.component';
import { NgxPrintModule } from 'ngx-print';
import { ProgramReportComponent } from './components/program-report/program-report.component';
import { TemplatesComponent } from './components/templates/templates.component';
import { ManageStudentComponent } from './components/templates/student/student.component';
import { BehaviorsComponent } from './components/templates/student/behaviors/behaviors.component';
import { BehaviorComponent } from './components/templates/student/behaviors/behavior/behavior.component';
import { ResponseTrackingComponent } from './components/templates/student/response-tracking/response-tracking.component';
import { AbcComponent } from './components/templates/student/abc/abc.component';
import { LicenseComponent } from './components/license/license.component';
import { UserSetupComponent } from './components/user-setup/user-setup.component';

@NgModule({ 
    declarations: [
        AppComponent,
        AbcComponent,
        AbcManagerComponent,
        AbcCollectionComponent,
        ConsoleComponent,
        DeviceManagementComponent,
        DeviceAppComponent,
        TagManagementComponent,
        MttTagsComponent,
        EditDropdownComponent,
        TimeInputComponent,
        ManageStudentsComponent,
        ManageDownloadDataComponent,
        ProgramReportComponent,
        TemplatesComponent,
        ManageStudentComponent,
        BehaviorsComponent,
        BehaviorComponent,
        ResponseTrackingComponent,
        LicenseComponent,
        UserSetupComponent
    ],
    bootstrap: [
        AppComponent
    ], 
    imports: [
        BrowserModule,
        FormsModule,
        
        BrowserAnimationsModule,
        AppRoutingModule,
        
        AmplifyAuthenticatorModule,

        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatTableModule,
        MatCheckboxModule,
        MatIconModule,
        MatListModule,
        MatDatepickerModule,
        MatMenuModule,
        MatRadioModule,
        MatExpansionModule,
        MatSidenavModule,
        MatNativeDateModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatTabsModule,
        MatSelectModule,

        NgChartsModule,
        NgxPrintModule
    ],
    providers: [
        provideHttpClient(withInterceptorsFromDi()),
        ApiClientService, 
        AuthClientService, 
        ChartUtilsService, 
        DateTimeService, 
        ErrorHandlingService, 
        UserService, 
        ViewerConfigService
    ] })
export class AppModule { }
