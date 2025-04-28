import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler, Provider } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { HttpClientModule } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SettingsComponent } from './components/student/settings/settings.component';
import { CreateComponent } from './components/student/create/create.component';
import { ProfileComponent } from './components/user/profile/profile.component';
import { SetupComponent } from './components/user/setup/setup.component';
import { ForgotpasswordComponent } from './components/user/forgotpassword/forgotpassword.component';
import { Dashboard2Component } from './components/student/dashboard2/dashboard2.component';
import { SettingsComponent as DashboardSettings } from './components/student/dashboard2/settings/settings.component';
import { BehaviorsComponent } from './components/student/settings/behaviors/behaviors.component';
import { DevicesComponent } from './components/student/settings/devices/devices.component';
import { TeamComponent } from './components/student/settings/team/team.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TrackingComponent } from './components/student/tracking/tracking.component';
import { DashboardMobileComponent } from './components/student/dashboard-mobile/dashboard-mobile.component';
import { NgxPrintModule } from 'ngx-print';
import { NgxEditorModule } from 'ngx-editor';
import { ListComponent } from './components/student/list/list.component';
import { InviteComponent } from './components/student/list/invite/invite.component';
import { ResponseTrackingComponent } from './components/student/settings/response-tracking/response-tracking.component';
import { PrintComponent } from './components/student/print/print.component';
import { AbcComponent } from './components/student/settings/abc/abc.component';
import { SubscriptionsComponent } from './components/student/settings/subscriptions/subscriptions.component';
import { BehaviorComponent } from './components/student/settings/behaviors/behavior/behavior.component';
import { DocumentsComponent } from './components/student/settings/documents/documents.component';
import { AmplifyAuthenticatorModule, AuthenticatorComponent } from '@aws-amplify/ui-angular';
import { CompareTrackingComponent } from './components/student/tracking/compare-tracking/compare-tracking.component';
import { IntervalPromptComponent } from './components/student/tracking/interval-prompt/interval-prompt.component';
import { SnapshotComponent } from './components/student/snapshot/snapshot.component';
import { ReportValueComponent } from './components/student/snapshot/report-value/report-value.component';
import { environment } from '../environments/environment';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';

import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { AbcCollectionComponent } from './components/abc-collection/abc-collection.component';
import { DownloadComponent } from './components/student/download/download.component';

import { MatMomentDateModule, MAT_MOMENT_DATE_FORMATS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDivider, MatDividerModule } from '@angular/material/divider';
import { MilestonesComponent } from './components/student/settings/milestones/milestones.component';
import { ManageScheduleComponent } from './components/student/settings/manage-schedule/manage-schedule.component';
import { MatSelectModule } from '@angular/material/select';
import { DeviceAppComponent } from './components/student/settings/devices/app/app.component';
import { MatTableModule } from '@angular/material/table';
import { TrackRegistrationComponent } from './components/student/settings/devices/track-registration/track-registration.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { LoadingComponent } from './components/loading/loading.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { AuthClientService, ErrorHandlingService } from '.';
import { DateDropdownComponent } from './components/controls/date-dropdown/date-dropdown.component';
import { DateSelectionComponent } from './components/controls/date-selection/date-selection.component';
import { DownloadDataComponent } from './components/controls/download-data/download-data.component';
import { EditDropdownComponent } from './components/controls/edit-dropdown/edit-dropdown.component';
import { MttTagsComponent } from './components/controls/mtt-tags/mtt-tags.component';
import { TimeInputComponent } from './components/controls/time-input/time-input.component';
import { NoteComponent } from './components/notes/note/note.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogModule } from '@angular/material/dialog';

AuthClientService.setEnvironment(environment);

const providers: Provider[] = [ CookieService ];
providers.push({provide: ErrorHandler, useClass: ErrorHandlingService },
  { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'fill'} });

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SettingsComponent,
    ProfileComponent,
    SetupComponent,
    ForgotpasswordComponent,
    Dashboard2Component,
    BehaviorsComponent,
    DevicesComponent,
    TeamComponent,
    TrackingComponent,
    DashboardMobileComponent,
    DashboardSettings,
    SnapshotComponent,
    ListComponent,
    InviteComponent,
    ResponseTrackingComponent,
    PrintComponent,
    AbcComponent,
    SubscriptionsComponent,
    BehaviorComponent,
    DocumentsComponent,
    CompareTrackingComponent,
    IntervalPromptComponent,
    ReportValueComponent,
    TimeInputComponent,
    NoteComponent,
    EditDropdownComponent,
    DateDropdownComponent,
    DateSelectionComponent,
    AbcCollectionComponent,
    DownloadComponent,
    DownloadDataComponent,
    MilestonesComponent,
    ManageScheduleComponent,
    DeviceAppComponent,
    TrackRegistrationComponent,
    DevicesComponent,
    LoadingComponent,
    TeamComponent,
    MttTagsComponent,
    CreateComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgChartsModule,
    BrowserAnimationsModule,
    FontAwesomeModule,
    NgxPrintModule,
    NgxEditorModule,
    AmplifyAuthenticatorModule,

    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatMomentDateModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatMenuModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatDividerModule,
    MatSelectModule,
    MatTableModule,
    MatRadioModule,
    MatChipsModule,
    MatToolbarModule,
    MatGridListModule,
    MatButtonToggleModule,
    MatDialogModule,
    DragDropModule,
  ],
  exports: [
  ],
  providers,
  bootstrap: [AppComponent]
})
export class AppModule { }
