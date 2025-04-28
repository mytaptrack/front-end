import { Component, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import {
  ManageClass, StudentClass, StudentBehaviorClass, moment,
  OptionEx
} from '../../lib';
import { ManageReportPostResponse, ManageReportOffsetDataPoint, ManageReportDateDataPoint } from '@mytaptrack/types'
import { UserService, ApiClientService } from '../../services';

interface BehaviorName {
  name: string;
  count: number;
  checked: boolean;
}

interface ProgramParams {
  reportType: 'weeksOn' | 'beforeDate',
  startDate: string;
  endDate: string;
  weeks: number;
}

@Component({
    selector: 'app-program-report',
    templateUrl: './program-report.component.html',
    styleUrls: ['./program-report.component.scss'],
    standalone: false
})
export class ProgramReportComponent implements OnInit {
  public behaviorNames: OptionEx[] = [];
  public selectedBehaviors: string[] = [];
  public reportOffsetData: ManageReportPostResponse<ManageReportOffsetDataPoint>;
  public reportDateData: ManageReportPostResponse<ManageReportDateDataPoint>;
  public chart: ChartConfiguration;
  public tableData: string[][];
  public weeks: number[] = [];
  public labels: string[] = [];
  public behaviorEditVal: string = '';
  public program: ProgramParams;
  public title: string;
  private managedStudents: StudentClass[];
  public showSettings: boolean = true;
  public loading: boolean = false;
  private _manage: ManageClass;

  displayedColumns: string[];

  constructor(
    private userService: UserService,
    private apiClient: ApiClientService) { }

  ngOnInit(): void {
    const startDate = moment();
    startDate.add(6 - startDate.month(), 'months');
    startDate.add(-1, 'year');
    startDate.add(-1 * startDate.weekday(), 'days');
    this.program = {
      reportType: 'beforeDate',
      weeks: 6,
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: moment().format('YYYY-MM-DD')
    }

    this.userService.user.subscribe(user => {
      if(!user) {
        return;
      }
      this._manage = user.management;
      this.load();
    });

  }

  async load() {
    this.setLoading(true);
    try {
      const [managedStudents] = await Promise.all([
        this._manage.getStudents()
      ]);
      this.managedStudents = managedStudents.students;

      const behaviors: StudentBehaviorClass[] = [].concat(...managedStudents.students.map(x => x.trackables.behaviors));
      const summary: BehaviorName[] = [];
      behaviors.forEach(x => {
        const existing = summary.find(y => y.name == x.name);
        if(!existing) {
          summary.push({
            name: x.name,
            checked: false,
            count: 1
          });
          return;
        }
        existing.count += 1;
      });

      this.behaviorNames = summary.map(x => ({ value: x.name, display: `${x.name} (${x.count})`}));

      this.displayedColumns = ['student', ...this.labels.map((_, i) => 'col' + i)];
    } finally {
      this.setLoading(false);
    }
  }

  showReportSettings() {
    this.chart = null;
    this.showSettings = true;
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }

  async runReport() {
    this.setLoading(true);
    try {
      const behaviorNames = this.selectedBehaviors.length > 0? this.selectedBehaviors : this.behaviorNames.map(x => x.value);
      this.showSettings = false;
      
      if(behaviorNames.length == 0) {
        return;
      }
      delete this.reportOffsetData;
      delete this.reportDateData;
      if(this.program.reportType == 'weeksOn') {
        this.title = 'Tracking weeks on program';
        this.reportOffsetData = await this.apiClient.getManagedEfficacy({
          behaviorNames,
          weeksTracked: this.program.weeks,
          startDate: this.program.startDate,
          license: (await this._manage.license).license
        });
        this.loadOffsetChart();  
      } else {
        this.title = `Students tracked between ${this.program.startDate} and ${this.program.endDate}`;
        this.reportDateData = await this.apiClient.postManagedReportOverTime({
          behaviorNames,
          startDate: this.program.startDate,
          endDate: this.program.endDate,
          license: (await this._manage.license).license
        });
        this.loadDateChart();
      }
    } finally {
      this.setLoading(false);
    }
  }

  loadDateChart() {
    this.labels = this.reportDateData.summary.sort((x, y) => x.date.localeCompare(y.date)).map(x => moment(x.date).format('MM/DD/yyyy'));
    const reportStudentData = this.reportDateData.students.filter(x => x && x.data? true : false);
    reportStudentData.sort((a , b) => b.data.length - a.data.length);
    this.tableData = reportStudentData.map(x => {
      const student = this.managedStudents.find(y => y.studentId == x.studentId);
      
      return [
        student? `${student.details.firstName} ${student.details.lastName}` : 'Student name not found',
        ...this.reportDateData.summary.map(y => {
          const data = x.data.find(z => z.date == y.date);
          if(!data) {
            return '';
          }
          return data.count.toString();
        })
      ];
    });

    this.chart = {
      type: 'line',
      options: {
        
      },
      data: {
        labels: this.labels,
        datasets: [
          { 
            label: 'overall',
            data: this.reportDateData.summary.sort((x, y) => x.date.localeCompare(y.date)).map(x => x.count)
          }
        ],
        yAxisID: 'yAxis'
      }
    } as ChartConfiguration;
    
    this.displayedColumns = ['student', ...this.labels.map((_, i) => 'col' + i)];
  }
  loadOffsetChart() {
    const weeks = [];
    for(let i = 0; i < this.program.weeks; i++) {
      weeks.push(i + 1);
    }
    this.labels = weeks.map(x => 'Week ' + x);

    this.reportOffsetData.students.sort((a , b) => b.data[b.data.length - 1].count - a.data[a.data.length - 1].count)
    this.tableData = this.reportOffsetData.students.map(x => {
      const student = this.managedStudents.find(y => y.studentId == x.studentId);
      return [
        student? `${student.details.firstName} ${student.details.lastName}` : 'Student name not found',
        ...x.data.map(y => y.count.toString())
      ];
    });

    this.chart = {
      type: 'line',
      options: {
        scales: {
          'yAxis': {
            min: 0
          }
        }
      },
      data: {
        labels: this.reportOffsetData.summary.sort((x, y) => x.offset - y.offset).map(x => x.offset + 1),
        datasets: [
          { 
            label: 'overall',
            data: this.reportOffsetData.summary.sort((x, y) => x.offset - y.offset).map(x => x.count)
          }
        ],
        yAxisID: 'yAxis'
      }
    } as ChartConfiguration;
  }

  addBehavior() {
    const val = this.behaviorNames.find(x => x.value.toLowerCase() == this.behaviorEditVal.toLowerCase());
    if(val && !this.selectedBehaviors.find(y => y == val.value)) {
      this.selectedBehaviors.push(val.value);
    }
    this.behaviorEditVal = '';
  }

  removeBehavior(val: string) {
    const index = this.selectedBehaviors.findIndex(x => x == val);
    if(index >= 0) {
      this.selectedBehaviors.splice(index, 1);
    }
  }
}
