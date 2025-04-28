import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { 
  ManageClass, StudentClass, UserClass,
  moment
} from '../../lib';
import { AccessLevel, LicenseDetails, } from '@mytaptrack/types'
import { UserService, ApiClientService } from '../../services';
import { read as readXlsx } from 'xlsx';

@Component({
    selector: 'app-manage-students',
    templateUrl: './students.component.html',
    styleUrls: [
      './students.component.scss'
    ],
    standalone: false
})
export class ManageStudentsComponent implements OnInit {
  displayedColumns: string[] = [
    'student',
    'nickname',
    'dedicated',
    'flexible',
    'none',
    'archive',
    'transfer',
    'actions'
  ];

  public user: UserClass;
  public manage: ManageClass;
  public students: StudentClass[];
  public flexChart: ChartConfiguration;
  public license: LicenseDetails;
  public loading: boolean;
  public showAdminButton: boolean = false;
  
  @ViewChild('importFileElement') public importFileElement: ElementRef;
  private _importFile: any;
  public get importFile() {
    return this._importFile;
  }
  public set importFile(val: any) {
    this._importFile = val;
  }

  get remainingDedicated() {
    if(!this.license) {
      return 0;
    }
    return this.license?.singleCount - this.students?.filter(x => x.licenseDetails?.fullYear).length;
  }

  constructor(private userService: UserService, private api: ApiClientService) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      if(!user) {
        this.user = undefined;
        this.manage = undefined;
        return;
      }
      this.user = user;
      this.manage = this.user.management;
      this.load();
    });
  }

  async load() {
    const [students, license] = await Promise.all([
      this.manage.getStudents(),
      this.manage.license
    ]);
    this.license = license;
    this.students = students.students;
    this.students.sort((a, b) => `${a.details.firstName} ${a.details.lastName}`.localeCompare(`${b.details.firstName} ${b.details.lastName}`));
  }

  async loadStats() {
    const stats = await this.manage.getStats();
    let chartMax = 0;
    stats.flexible.forEach(x => {
      if(chartMax < x.count) {
        chartMax = x.count + 2;
      }
    });
    
    if(chartMax < 7) {
      chartMax = 7;
    }
    this.flexChart = {
      type: 'line',
      data: {
        labels: stats.flexible.map(x => moment(x.date).format('MM/DD/yyyy')),
        datasets: [{
          data: stats.flexible.map(x => x.count),
          label: 'Flexible license usage',
          xAxisID: 'xAxes',
          yAxisID: 'yAxes'
        }]
      },
      options: {
        scales: {
          yAxes: {
            type: 'linear',
            min: 0,
            max: chartMax,
            ticks: {
              stepSize: Math.floor(chartMax / 4)
            }
          },
          xAxes: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 7,
            ticks: {
              stepSize: 1,
              autoSkip: false,
              // Include a dollar sign in the ticks
              callback: function (value, index, values) {
                return moment(stats.flexible[index].date).format('MM/DD/yyyy');
              }
            }
          }
        }
      }
    };

    this.flexChart = this.flexChart;
  }

  private getExcelSegments(input) {
    const columnEnd = input.match(/\d/).index;
    const cols = [];
    for(let i = 0; i < 26; i++) {
      cols[String.fromCharCode('A'.charCodeAt(0) + i)] = i;
    }
    return {
      col: cols[input.slice(0, columnEnd)],
      row: Number.parseInt(input.slice(columnEnd))
    };
  }
  private getExcelCellCode(column: number, row: number) {
    return String.fromCharCode('A'.charCodeAt(0) + column) + row;
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }
  async onFileSelected(event: any) {
    const importContant = event.nativeElement.files[0];
    const filename: string = this.importFileElement.nativeElement.value.toLowerCase();

    let content;
    if(filename.endsWith('.xlsx')) {
      try {
        const buffer = new Buffer(await importContant.arrayBuffer()).toString('base64');
        const data = readXlsx(buffer);
        const sheet = data.Sheets[data.SheetNames[0]];
        const rangeString = sheet['!ref'];
        const [start, end] = rangeString.split(':').map(x => this.getExcelSegments(x));
        const headers: string[] = [];
        for(let i = start.col; i <= end.col; i++) {
          headers[i] = sheet[this.getExcelCellCode(i, start.row)]?.w;
        }

        const firstName = headers.indexOf('First Name*');
        const lastName = headers.indexOf('Last Name*');
        const licenseType = headers.indexOf('License Type*');
        const teamEmails = headers.indexOf('Team Emails');
        const tagOffset = teamEmails >= 0 ? 4 : 3;
        const tags = headers.slice(tagOffset);

        const students = [];
        for(let i = start.row + 1; i <= end.row; i++) {
          let invites = [];
          if(teamEmails >= 0) {
            const teamEmailsValue = sheet[this.getExcelCellCode(teamEmails, i)]?.w;
            if(teamEmailsValue) {
              invites = teamEmailsValue.split(/[, ]/).map(x => x.trim());
            }
          }
          const student = {
            firstName: sheet[this.getExcelCellCode(firstName, i)]?.w,
            lastName: sheet[this.getExcelCellCode(lastName, i)]?.w,
            licenseType: sheet[this.getExcelCellCode(licenseType, i)]?.w,
            invites,
            tags: tags.map((x, ii) => {
              const val = sheet[this.getExcelCellCode(ii + tagOffset, i)]?.w;
              if(!val) {
                return;
              }
              if(x) {
                return x + ':' + val
              }
              return val;
            }).filter(x => x? true : false)
          };
          students.push(student);
        }
        await this.api.putManagedStudents({
          students: students,
          license: this.user.license
        });
        window.location.reload();
      } catch (err) {

      } finally {
        this.setLoading(false);
      }
    } else {
      alert(`File type invalid ${filename}`)
    }
  }
  async remove(student: StudentClass) {
    if(!confirm(`Are you sure you want to remove ${student.details.firstName} ${student.details.lastName}?`)) {
      return;
    }
    await student.remove();
  }

  async addAdmin(student: StudentClass) {
    student.saving = true;
    try {
      const newMember = prompt('Enter the email of the new admin');
      if(!newMember) {
        return;
      }
      if(!newMember.match(/.*\@.*/)) {
        alert('Invalid email');
        return;
      }

      await student.ensureFullStudent();
      const team = await student.team.getTeam();
      if(team.find(x => x.details.email === newMember)) {
        alert('User already in team');
        return;
      }
      const member = student.team.createTeamMember();
      member.details = {
        email: newMember,
        name: newMember
      };
      member.restrictions = {
        abc: AccessLevel.admin,
        behavior: AccessLevel.admin,
        comments: AccessLevel.admin,
        data: AccessLevel.admin,
        schedules: AccessLevel.admin,
        devices: AccessLevel.admin,
        team: AccessLevel.admin,
        milestones: AccessLevel.admin,
        reports: AccessLevel.admin,
        notifications: AccessLevel.admin,
        documents: AccessLevel.admin,
        info: AccessLevel.admin, 
        service: AccessLevel.admin, 
        serviceData: AccessLevel.admin, 
        serviceGoals: AccessLevel.admin, 
        serviceSchedule: AccessLevel.admin
      };
      await member.save();
    } finally {
      student.saving = false;
    }
  }
}
