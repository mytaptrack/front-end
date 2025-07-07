import { Injectable } from '@angular/core';
import { AuthClientService } from './auth-client.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MytaptrackEnvironment } from '../config/environment';
import { User, ReportDetails, ActivityGroupDetails, UserSubscriptionResponse, 
  IoTDevice, UserSummary, UserContext, 
  Student, StudentBehavior, 
  StudentCreateRequest, Notification, ActivityGroupSummary, 
  SubscriptionDeleteRequest, 
  TeamPutRequest, TeamPostRequest, TeamDeleteRequest, 
  ReportData, UserPutRequest, 
  SubscriptionPostRequest, StudentDataPut, BehaviorSubscription, 
  PutSettingsRequest, UserSummaryRestrictions, 
  StudentNotesPut, DevicePutRequest, StudentTrackStateGetResponse, 
  StudentTrackPut, StudentNotesPost, DailyNote, LicenseDetails, ApplyLicenseRequest, LicenseDetailsWithUsage,
  LicenseStats, DeleteDeviceRequest, StudentDashboardSettings, StudentDataExcludeRequest, 
  StudentReportPostRequest, StudentSummaryReport, MobileDevice, 
  ManageStudentGetResponse, GetLicenseTemplatesResponse,
  EfficacyPostRequest, ManageReportPostResponse, ManageReportDateDataPoint, ManageReportOffsetDataPoint,
  AbcCollection, ScheduleCategory,
  NotificationDetailsBehavior, TrackDeviceTermStatus, StudentSummary,
  StudentSummaryStats, LicenseStudentTemplatePut, LicenseStudentTemplateDelete,
  AppPutRequest, StudentResponse, StudentResponsePutRequest, UserSummaryStatus, SchedulePutRequest, 
  ScheduleDeleteRequest, OverwriteSchedulePutRequest, OverwriteScheduleDeleteRequest, IoTAppDevice, 
  DeviceRegisterPutRequest, TrackDeviceActionRequest, StudentSubscriptions, 
  NotificationDetailsTeam, PutDocumentRequest, StudentBulkPut, StudentDocument, LicenseDisplayTagsPut, ManageAppRenamePostRequest,
  StudentExcludeIntervalPutRequest, moment,
  QLStudentNote, QLStudentNoteRequest, QLStudentUpdateInput, QLStudent, QLServerSettings
} from '../types';
import { del, generateClient, get, GraphQLQuery, GraphQLSubscription, post, put } from '@aws-amplify/api';

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  hitErrorCode0: boolean = false;

  constructor(
    private auth: AuthClientService, 
    public http: HttpClient) {
  }


  sendError(error) {
    if(error.message == 'Network Error') {
      return;
    }
    return this.post('user/error', { 
      message: error.message || error.error,
      body: error,
      url: document.URL
    }, true);
  }

  async getLicense(license: string): Promise<LicenseDetails> {
    return await this.get('v2/license?license=' + license);
  }
  async getLicenseStats(license: string): Promise<LicenseStats> {
    return await this.get('v2/manage/stats?license=' + license);
  }
  async putAbcCollections(collections: AbcCollection[]) {
    return await this.put('v2/manage/abc', collections);
  }
  async getManagedEfficacy(request: EfficacyPostRequest): Promise<ManageReportPostResponse<ManageReportOffsetDataPoint>> {
    return await this.post('v2/manage/efficacy', request);
  }
  async postManagedReportOverTime(request: any): Promise<ManageReportPostResponse<ManageReportDateDataPoint>> {
    return await this.post('v2/manage/report/time', request);
  }
  async getManagedApps(license: string) {
    return await this.get<MobileDevice[]>('v2/manage/apps?license=' + license);
  }
  async getManagedStudents(license: string) {
    return await this.get<ManageStudentGetResponse>('v2/manage/students?license=' + license);
  }
  async putManagedStudents(data: StudentBulkPut) {
    return await this.put('v2/manage/students', data);
  }
  async postUpdateManagedApp(request: ManageAppRenamePostRequest): Promise<MobileDevice> {
    return await this.put('v2/manage/app', request);
  }
  async deleteManagedApp(request: DeleteDeviceRequest): Promise<void> {
   await this.delete(`v2/manage/app?studentId=${request.studentId}&dsn=${request.dsn}&isApp=1&dsn=${request.dsn}`);
  }

  async getManagedTemplates() {
    return await this.get<GetLicenseTemplatesResponse>('v2/manage/templates')
  }
  async putManagedTemplate(template: LicenseStudentTemplatePut) {
    return await this.put('v2/manage/template', template)
  }
  async deleteManagedTemplate(template: LicenseStudentTemplateDelete) {
    return await this.delete(`v2/manage/template?license=${template.license}&name=${template.name}`);
  }

  async putUserProfile(user: User, acceptTerms: boolean): Promise<User> {
    const body = {
        firstName: user.details.firstName,
        lastName: user.details.lastName,
        name: user.details.name,
        state: user.details.state,
        zip: user.details.zip,
        acceptTerms: acceptTerms === true
    } as UserPutRequest;

    return await this.put('v2/user', body);
  };

  async putSettings(studentId: string, settings: StudentDashboardSettings) {
    const body = {
      studentId,
      overwriteStudent: false,
      settings
    } as PutSettingsRequest;

    return await this.put('v2/reports/settings', body);
  }

  async putStudentDashboard(studentId: string, settings: StudentDashboardSettings) {
    const body = {
      studentId,
      overwriteStudent: true,
      settings
    } as PutSettingsRequest;
    
    return await this.put('v2/reports/settings', body);
  }

  async getDefaultDashboardStudent(studentId: string) {
    return await this.get<StudentDashboardSettings>('v2/reports/settings?studentId=' + studentId);
  }

  async getUserSubscriptions(request: SubscriptionPostRequest) : Promise<UserSubscriptionResponse> {
      return await this.post('user/subscription', request);
  };

  async createUserSubscription(request: BehaviorSubscription) {
      return await this.put('user/subscription', request);
  };

  async deleteUserSubscription(request: SubscriptionDeleteRequest) {
    return await this.delete(`user/subscription?studentId=${request.studentId}&behaviorId=${request.behaviorId}`);
  };

  async dashboardSummaryGet() : Promise<User> {
    return (await this.get('v2/user')) as User;
  };

  async getReports(studentId) {
    return await this.get(`student/reports?studentId=${studentId}`) as string[];
  }

  async postReport(request: StudentReportPostRequest) {
    return await this.post('student/report', request) as StudentSummaryReport;
  }

  async putReport(request: StudentSummaryReport) {
    request.behaviors.forEach(x => {
      delete x.stats
      x.faces.forEach(y => {
        if(!y.overwrite) {
          delete y.overwrite;
        }
      })
    });
    return await this.put('student/report', request);
  }

  async putNotes(studentId: string, date: string, lastModifiedDate: string, notes: string) {
    let content = {
      studentId,
      date,
      lastModifiedDate,
      updateDate: new Date().toISOString(),
      notes
    } as StudentNotesPut;

    return await this.put('v2/reports/notes', content);
  }

  getNotes(studentId: string, date: string): Promise<DailyNote> {
    const content = {
      studentId: studentId,
      date: date
    } as StudentNotesPost;

    return this.post('v2/reports/notes', content);
  }

  async getStudentTeamMembers(studentId): Promise<UserSummary[]> {
    return this.get<UserSummary[]>('v2/student/team?studentId=' + studentId);
  }

  async putTeamMember(studentId: string, userId: string, details: { name: string, email: string }, restrictions: UserSummaryRestrictions, sendEmail: boolean) : Promise<UserSummary> {
    Object.keys(restrictions).forEach(key => {
      if(restrictions[key] == null) {
        delete restrictions[key]
      }
    });
    let content = {
        userId: userId ?? '',
        status: UserSummaryStatus.PendingApproval,
        details: details,
        studentId,
        restrictions: {
          ...restrictions,
          behaviors: restrictions.behaviors? restrictions.behaviors : undefined
        },
        sendEmail,
    } as TeamPutRequest;
    return await this.put('v2/student/team', content);
  }

  async acceptAllTeamMemberInvites() {
    let content = {
        studentId: undefined,
        inviteDate: undefined,
        all: true,
        accepted: true
    } as TeamPostRequest;

    return await this.post('v2/student/team', content);
  }
  async acceptTeamMemberInvite(studentId: string, inviteDate: number) {
    let content = {
        studentId: studentId,
        inviteDate: inviteDate,
        accepted: true,
        all: false
    } as TeamPostRequest;

    return await this.post<StudentSummary>('v2/student/team', content);
  }
  async ignoreTeamInvite(studentId: string, inviteDate: number) {
    let content = {
        studentId: studentId,
        inviteDate: inviteDate,
        accepted: false
    } as TeamPostRequest;

    return await this.post('v2/student/team', content);
  }

  async removeTeamMember(studentId: string, userId: string) {
    let content = {
        studentId: studentId,
        userId: userId
    } as TeamDeleteRequest;

    return await this.delete(`v2/student/team?userId=${userId}&studentId=${studentId}`);
  }

  async createStudent(student: StudentCreateRequest) : Promise<Student> {
    return await this.put('v2/student', student) as Student;
  }

  async getStudentV2(studentId: string) : Promise<Student> {
    return (await this.get('v2/student?studentId=' + studentId)) as Student;
  }

  async getDataV2(studentId: string, start: moment.Moment, end: moment.Moment) : Promise<ReportDetails> {
    return await this.get(`v2/reports/data?studentId=${studentId}&startDate=${start.format('yyyy-MM-DD')}&endDate=${end.format('yyyy-MM-DD')}`);
  }

  async putStudentDataV2(event: StudentDataPut) : Promise<void> {
    await this.put('v2/reports/data', event);
  }

  async putStudentDataDate(event: StudentDataExcludeRequest) : Promise<void> {
    await this.put('v2/reports/data/date', event);
  }


  async putExcludeInterval(request: StudentExcludeIntervalPutRequest) {
    return await this.put('v2/reports/data/interval', request);
  }

  async removeStudentData(studentId: string, data: ReportData) {
    return await this.delete(`v2/reports/data?studentId=${studentId}&behaviorId=${data.behavior}&date=${moment(data.dateEpoc).toISOString()}`);
  }

  async putStudentResponse(studentId: string, response: StudentResponse): Promise<StudentResponse> {
    let content = {
      studentId,
      response
    } as StudentResponsePutRequest;
    return await this.put('v2/student/response', content);
  }

  async getStudentDevicesV2(studentId: string): Promise<IoTDevice[]> {
    return (await this.get<IoTDevice[]>('v2/student/devices?studentId=' + studentId))
  }
  async putStudentAppV2(request: AppPutRequest): Promise<IoTAppDevice> {
    return (await this.put('v2/student/devices/app', request));
  }
  async getStudentAppV2(studentId: string, dsn: string, deviceId?: string) {
    return (await this.get<IoTDevice>(`v2/student/devices/app?studentId=${studentId}&appId=${dsn}&deviceId=${deviceId}`));
  }
  async getStudentAppQRCode(studentId: string, dsn: string): Promise<{id: string; token: string;}> {
    return (await this.get<{id: string; token: string;}>(`v2/student/devices/app/qrcode?studentId=${studentId}&appId=${dsn}`));
  }
  async deleteStudentAppV2(studentId: string, dsn: string) {
    await this.delete(`v2/student/devices/app?studentId=${studentId}&dsn=${dsn}&isApp=true`);
  }

  async getTrackDeviceV2(studentId: string, dsn: string): Promise<IoTDevice> {
    return await this.get<IoTDevice>(`v2/student/devices/track?studentId=${studentId}&dsn=${dsn}`);
  }
  async putTrackDeviceV2(request: DevicePutRequest) {
    return this.put('v2/student/devices/track', request);
  }
  async deleteTrackDeviceV2(request: DeleteDeviceRequest) {
    return this.delete(`v2/student/devices/track?studentId=${request.studentId}&dsn=${request.dsn}&isApp=0&dsn=${request.dsn}`);
  }
  async putTrackRegistrationV2(request: DeviceRegisterPutRequest) {
    return this.put('v2/student/devices/track/register', request);
  }
  async postTrackResyncV2(request: TrackDeviceActionRequest) {
    return this.post('v2/student/devices/track/resync', request);
  }
  async putTrackTermSetupV2(request: TrackDeviceActionRequest) {
    return this.put('v2/student/devices/track/term', request);
  }
  async getTrackTermSetupV2(studentId: string, dsn: string): Promise<TrackDeviceTermStatus> {
    return await this.get<TrackDeviceTermStatus>(`v2/student/devices/track/term?studentId=${studentId}&dsn=${dsn}`);
  }

  async listSnapshots(studentId: string) {
    return await this.get<string[]>(`v2/reports/snapshot?studentId=${studentId}`);
  }
  async getSnapshot(input: StudentReportPostRequest): Promise<StudentSummaryReport> {
    return await this.post('v2/reports/snapshot', input);
  }
  async putSnapshot(input: StudentSummaryReport) {
    input.behaviors.forEach(x => {
      if(x.faces) {
        x.faces.forEach(y => {
          if(!y.overwrite) {
            delete y.overwrite;
          }
        });
      }
    });
    return await this.put('v2/reports/snapshot', input);
  }

  async getDurationStatus(studentId: string) {
    return await this.get<StudentTrackStateGetResponse>(`v2/reports/data/status?studentId=${studentId}`);
  }
  async putStudentBehaviorV2(studentId: string, behavior: StudentBehavior): Promise<StudentBehavior> {
    let content = {
        studentId: studentId,
        behavior
    };
    return await this.put('v2/student/behavior', content) as StudentBehavior;
  };
  async deleteStudentBehaviorV2(studentId: string, itemToDelete: StudentBehavior) {
    return await this.delete(`v2/student/behavior?studentId=${studentId}&behavior=${itemToDelete.name}&id=${itemToDelete.id}`);
  };

  async putStudentResponseV2(studentId: string, response: StudentResponse): Promise<StudentResponse> {
    let content = {
        studentId: studentId,
        response
    } as StudentResponsePutRequest;
    return await this.put('v2/student/response', content) as StudentResponse;
  };
  async deleteStudentResponseV2(studentId: string, itemToDelete: StudentBehavior) {
    return await this.delete(`v2/student/response?studentId=${studentId}&id=${itemToDelete.id}`);
  };
  
  async putStudentAbcV2(studentId: string, abc: AbcCollection): Promise<AbcCollection> {
    let content = {
      ...abc,
      tags: abc.tags ?? [],
      studentId
    };
    return await this.put('v2/student/abc', content);
  }
  async deleteStudentAbcV2(studentId: string): Promise<void> {
    await this.delete(`v2/student/abc?studentId=${studentId}`);
  }

  async deviceRegisterVerify(dsn: string, studentId: string) : Promise<IoTDevice> {
    return (await this.post('student/device', {
        dsn: dsn,
        studentId: studentId
    })) as IoTDevice;
  }

  getNotificationsStudent(studentId: string): Promise<Notification<NotificationDetailsBehavior>[]> {
    return this.get<Notification<NotificationDetailsBehavior>[]>('v2/student/notification?studentId=' + studentId);
  }
  getStudentStats() {
    return this.get<{ invites: Notification<NotificationDetailsTeam>[], stats: StudentSummaryStats[] }>('v2/user/alerts');
  }
  async ignoreNotification(notification: Notification<any>) {
    return await this.delete(`v2/student/notification?date=${notification.date}&studentId=${notification.details.studentId}&behaviorId=${notification.details.behaviorId}&type=${notification.details.type}`);
  }

  async ignoreNotificationsForStudent(studentId: string) {
    return this.delete(`v2/student/notification?date=0&studentId=${studentId}&behaviorId=all&type=all`);
  }

  async ignorePendingForStudent(studentId: string) {
    return this.delete(`v2/student/notification?date=0&studentId=${studentId}&behaviorId=all&type=pending`);
  }

  async getSavedActivities() : Promise<UserContext> {
    return await this.get('context') as UserContext;
  }

  async getActivityGroup(groupId: string) : Promise<ActivityGroupDetails> {
    return await this.get<ActivityGroupDetails>('context/activity/group?activityGroupId=' + groupId);
  }

  async deleteActivityGroup(activityGroup: ActivityGroupSummary) {
    return await this.delete(`context/activity/group?id=${activityGroup.id}`);
  }

  async getLicenses(): Promise<LicenseDetailsWithUsage[]> {
    return await this.get('v2/licenses');
  }
  async putLicense(license: LicenseDetails): Promise<LicenseDetails> {
    return await this.put('v2/license', license);
  }
  async putLicenseStudent(applyData: ApplyLicenseRequest): Promise<Student> {
    return await this.put('v2/license/student', applyData);
  }
  async permanentlyDeleteStudent(studentId: string) {
    return await this.delete(`v2/license/student?studentId=${studentId}`);
  }
  async putLicenseDisplayTags(request: LicenseDisplayTagsPut): Promise<void> {
    return await this.put('v2/license/displaytags', request);
  }
  async getDedicatedStudentIds(): Promise<string[]> {
    return await this.get('license/dedicated');
  }
  async deleteLicense(license: string): Promise<void> {
    await this.delete('license?license=license');
  }

  async getSchedules(studentId: string): Promise<ScheduleCategory[]> {
    return await this.get(`v2/student/schedules?studentId=${studentId}`);
  }
  async putSchedule(input: SchedulePutRequest) {
    return await this.put('v2/student/schedule', input);
  }
  async deleteSchedule(input: ScheduleDeleteRequest) {
    return await this.delete(`v2/student/schedule?category=${input.category}&studentId=${input.studentId}&date=${moment(input.date).format('yyyy-MM-DD')}`);
  }
  async putScheduleOverwrite(input: OverwriteSchedulePutRequest) {
    return await this.put('v2/reports/schedule', input);
  }
  async deleteScheduleOverwrite(input: OverwriteScheduleDeleteRequest) {
    return await this.put('v2/reports/schedule', input);
  }

  async putSubscriptions(input: StudentSubscriptions) {
    return await this.put('v2/student/subscriptions', input);
  }
  async getSubscriptions(studentId: string): Promise<StudentSubscriptions> {
    return await this.get(`v2/student/subscriptions?studentId=${studentId}`);
  }

  async putDocument(input: PutDocumentRequest): Promise<StudentDocument | string> {
    return await this.put('v2/student/document', input);
  }
  async getDocuments(studentId: string): Promise<StudentDocument[]> {
    return await this.get(`v2/student/document?studentId=${studentId}`);
  }
  async getDocumentUrl(studentId: string, documentId: string): Promise<string> {
    return await this.get(`v2/student/document?studentId=${studentId}&documentId=${documentId}`);
  }
  async deleteDocument(studentId: string, documentId: string) {
    return await this.delete(`v2/student/document?studentId=${studentId}&id=${documentId}`);
  }

  private async get<T>(subpath: string): Promise<T> {
    if(!this.auth.token) {
      return;
    }

    let retry = 0;
    let error;
    do {
      try {
        subpath = this.processImpersonate(subpath);

        const getOperation = get({
          apiName: 'api', 
          path: subpath,
          options: {
            headers: {
              Authorization: `Bearer ${this.auth.token}`,
              origin: window.location.origin
            }
          }
        });
        const response = await getOperation.response;

        return (await response.body.json()) as T;
      } catch (err) {
        if(err.status == 0 || err.name == 'NetworkError') {
          this.hitErrorCode0 = true;
        } else if(err.status != 500) {
          throwError(err, this);
        }
        error = err;
      }
    } while(retry++ < 3);
    throw error;
  }

  private async put(subpath: string, content: any, hideError: boolean = false): Promise<any> {
    if(!this.auth.token) {
      return;
    }

    let retry = 0;
    let error;
    do {
      try {
        subpath = this.processImpersonate(subpath);

        const putResult = put({
          apiName: 'api',
          path: subpath,
          options: {
            body: content,
            headers: {
              Authorization: 'Bearer ' + this.auth.token
            }
          }
        });

        const response = (await putResult.response).body.json();

        return response;
      } catch (err) {
        if(err.status == 0) {
          this.hitErrorCode0 = true;
        } else if(err.status != 500) {
          if(!hideError) {
            throwError(err, this);
          }
        }
        error = err;
      }
    } while(retry++ < 3);
    throw error;
  }

  private processImpersonate(subpath: string) {
    const impersonateUserId = localStorage.getItem('impersonateUserId');
    if(impersonateUserId) {
      if(subpath.indexOf('?') >= 0) {
        subpath += '&Impersonate=' + impersonateUserId;
      } else {
        subpath += '?Impersonate=' + impersonateUserId;
      }
    }
    return subpath;
  }

  private async delete(subpath: string) {
    if(!this.auth.token) {
      return;
    }

    const headers = new HttpHeaders({Authorization: this.auth.token});
    headers.set('Authorization', this.auth.token);
    subpath = this.processImpersonate(subpath);

    let retry = 0;
    let error;
    do {

      try {
        const delResponse = await del({
          apiName: 'api', 
          path: subpath,
          options: {
            headers: {
              Authorization: 'Bearer ' + this.auth.token
            }
          } as any
        });

        const result = (await delResponse.response);

        return result;
      } catch (err) {
        if(err.status == 0) {
          this.hitErrorCode0 = true;
        } else if (err.status != 500) {
          throwError(err, this);
        }
        error = err;
      }
    } while (retry++ < 3);
    throw error;
  };

  private async post<T>(subpath: string, content: any, hideError: boolean = false) {
    if(!this.auth.token) {
      return;
    }
    let retry = 0;
    let error;
    do {
      try {
        subpath = this.processImpersonate(subpath);

        const client = generateClient();
        const postResponse = await post({
          apiName: 'api',
          path: subpath, 
          options: {
            body: content,
            headers: {
              Authorization: 'Bearer ' + this.auth.token
            }
          }
        });

        const response = (await postResponse.response).body.json();
        return (response as any) as T;
      } catch (err) {
        if(err.status == 0) {
          this.hitErrorCode0 = true;
        } else if(err.status != 500) {
          if(!hideError) {
            throwError(err, this);
          }
        }
        error = err;
      } 
    } while (retry++ < 3);
    throw error;
  }

  async subscribeQLNotes(studentId: string, callback: (val: QLStudentNote) => void) {
    return await this.gqlSubscribe(`
      subscription onStudentNote {
        onStudentNote(studentId: "174d21ba-e009-40a9-8d9b-9fa205f7139c") {
          dateEpoc
          note
          noteDate
          noteId
          product
          studentId
          source {
            id
            name
            type
          }
        }
      }
      `, { studentId }, 'onStudentNote', callback);
  }

  async putQLNotes(note: QLStudentNote) {
    let content = {
      input: note
    };

    const retval = await this.gqlQuery<QLStudentNote>(`mutation updateNotes($input: StudentNoteInput!) {
      updateNotes(input: $input) {
        studentId
        noteDate
        dateEpoc
        date
        note
        noteId
        product
        source {
          type
          id
          name
        }
      }
    }`, content, 'updateNotes');

    return retval;
  }

  getQLNotes(studentId: string, startDate: string, endDate): Promise<QLStudentNote[]> {
    const content = {
      studentId,
      startDate,
      endDate
    } as QLStudentNoteRequest;

    return this.gqlQuery<QLStudentNote[]>(`
    query getNotes($studentId: String!, $startDate: String!, $endDate: String!) {
      getNotes(endDate: $endDate, startDate: $startDate, studentId: $studentId) {
        studentId
        noteDate
        dateEpoc
        note
        noteId
        product
        source {
          type
          id
          name
        }
      }
    }`, content, 'getNotes');
  }

  async updateStudent(student: QLStudentUpdateInput) {
    return await this.gqlQuery<QLStudent>(`mutation updateStudent($student: StudentInput!) {
      updateStudent(student: $student) {
        studentId
        license
        lastUpdateDate
        lastTracked
        details {
          firstName
          lastName
          nickname
          tags {
            tag
            type
          }
        }
        behaviors {
          baseline
          daytime
          desc
          id
          isArchived
          isDuration
          trackAbc
          managed
          name
          requireResponse
          tags {
            tag
            type
          }
          targets {
            measurement
            measurements {
              name
              value
            }
            progress
            target
            targetType
          }
        }
        services {
          currentBalance
          desc
          detailedTargets {
            date
            groupId
            target
            type
          }
          durationRounding
          endDate
          goals {
            goalTargets {
              goal
              name
              startAt
            }
            trackGoalPercent
          }
          id
          isArchived
          lastUpdateDate
          measurementUnit
          modifications
          name
          period
          startDate
          target
        }
      }
    }
    `, { student }, 'updateStudent')
  }

  private async gqlSubscribe<T>(query: string, variables: any, wrapper: string, callback: (val: T) => void): Promise<GraphQLSubscription<T>> {
    const client = generateClient({ authToken: this.auth.token });
    const retval: GraphQLSubscription<T> = (await client.graphql<GraphQLSubscription<T>>({
      query, variables
    })) as any;
    if(retval instanceof Promise) {
      await retval;
    }
    // const subscription = retval.subscribe({
    //   next: ({ provider, value}) => { 
    //     callback(value.data[wrapper]); 
    //   },
    //   error: (error) => console.error(error)
    // });

    // return subscription;
    return null;
  }

  getServerSettings() {
    return this.gqlQuery<QLServerSettings>(`query getServerSettings {
      getServerSettings {
        token
      }
    }`, undefined, 'getServerSettings');
  
  }

  private async gqlQuery<T>(query: string, params: any, resultField: string): Promise<T> {
    let retry = 0;
    let error;
    do {
      try {
        const client = generateClient({ authToken: this.auth.token });
        const response = await client.graphql<GraphQLQuery<any>>({
          query, 
          variables: params
        });

        return (response?.data)? response.data[resultField] as T : undefined;
      } catch (err) {
        if(err.status == 0) {
          this.hitErrorCode0 = true;
        } else if(err.status != 500) {
          throwError(err, this);
        }
        error = err;
      }
    } while(retry++ < 3);
    throw error;
  }
}

interface ErrorMessage {
  error: {
    bubbles: boolean;
    cancelBubble: boolean;
    cancelable: boolean;
    composed: boolean;
    defaultPrevented: boolean;
    eventPhase: number
    isTrusted: boolean;
    lengthComputable: boolean;
    loaded: number;
    path: [];
    returnValue: number;
    srcElement: XMLHttpRequest;
    target: XMLHttpRequest;
    timeStamp: number;
    total: number;
    type: string;
  } | string;
  message: string;
  name: string;
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  stack?: any;
}

export class WebError extends Error {
  public type = 'WebError'
  constructor(message, stack) {
    super(message);
    if(stack) {
      this.stack = stack;
    }
  }
}

function throwError(err: ErrorMessage, client: ApiClientService) {
  console.error(err.toString());
  if(err.status != 0) {
    client.sendError({
      message: err.message,
      stack: err.stack,
      url: err.url,
      status: err.status
    });
  }
  if(err.message) {
    console.log('message', err);
    throw new WebError(err.message, err.stack);
  }
  if(err.statusText) {
    console.log('status text', err);
    throw new WebError(err.statusText, err.stack);
  }
  if(typeof err.error == 'string') {
    console.log('error', err);
    throw new WebError(err.error as string, err.stack);
  }

  throw new WebError(err, err.stack);
}