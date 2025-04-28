import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Dashboard2Component } from '../dashboard2/dashboard2.component';
import { 
  ViewerConfigService, DateTimeService, ChartUtilsService, UserService,
  StudentBehavior, ReportData, Milestone, BehaviorSettings, ScheduledReportData
} from '../../..';
import { ActivatedRoute, Router } from '@angular/router';

const colors = ['#77F', '#F77', '#7F7', '#777', '#33ffff', '#ff66ff', '#ffb266', '#9933ff'];
const colors_light = ['#C2C2FF', '#FFC2C2', '#C2FFC2', '#777', '#33ffff', '#ff66ff', '#ffb266', '#9933ff'];

interface DisplayMilestones extends Milestone {
  color: string;
}

interface DisplayBehavior extends StudentBehavior {
  color: string;
  metricType: string;
}

interface StudentSettings {
  studentId: string;
  behaviors: BehaviorSettings[];
}

interface UserSettings {
  students: StudentSettings[];
}

interface TableData extends ScheduledReportData {
  activity: string;
  activityStart: string;
  activityEnd: string;
  rowSpan: number;
  name: string;
  time: string;
  raw: ReportData;
}

enum DailyTabs {
  frequency = 'frequency',
  duration = 'duration',
  interval = 'interval',
  notes = 'notes'
}

interface ChartElement {
  left: number;
  top: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-dashboard-mobile',
  templateUrl: './dashboard-mobile.component.html',
  styleUrls: ['./dashboard-mobile.component.scss'],
  standalone: false
})
export class DashboardMobileComponent extends Dashboard2Component {

  constructor(userService: UserService,
    chartService: ChartUtilsService,
    dateService: DateTimeService,
    viewerConfigService: ViewerConfigService, 
    router: Router, 
    route: ActivatedRoute, 
    cd: ChangeDetectorRef) {
      super(userService, 
          chartService, 
          dateService,
          viewerConfigService,
          router,
          route,
          cd);
      this.redirectToMobile = false;
  }
}
