import { Component, OnInit, ElementRef, ViewChild, Input } from '@angular/core';
import { 
  ScheduleCategoryClass, DateTimeService, UserService, AccessLevel, 
  Activity, ScheduleClass, StudentClass, StudentSchedulesClass, moment,
  Moment
} from '../../../..';
import { convertToHtml } from 'mammoth/mammoth.browser';
import { xml2js as parseXml } from 'xml-js';
import { read as readXlsx } from 'xlsx';

@Component({
  selector: 'app-manage-schedule',
  templateUrl: './manage-schedule.component.html',
  styleUrls: ['./manage-schedule.component.scss'],
  standalone: false
})
export class ManageScheduleComponent implements OnInit {
  public scheduleName: string = '';
  public categoryName: string = '';
  public scheduleCategories: StudentSchedulesClass;
  public currentCategory: ScheduleCategoryClass = null;
  public schedule: ScheduleClass = null;
  public daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  public loading: boolean = true;
  public loadingText: string = 'Loading'
  public errors: { titleError: string, startError: string, endError: string}[] = [];
  public showDatePickerDropdown: boolean = false;
  public fromDate: Moment;
  public hoveredDate: Moment;
  public showLoadSchedule: boolean = false;
  public version: moment.Moment;
  public readOnly: boolean = false;

  public get user() {
    return this.userService.user.value;
  }
  
  @ViewChild('importFileElement') public importFileElement: ElementRef;
  private _importFile: string;
  private _importContent: File;
  private _student: StudentClass;

  public get importFile() {
    return this._importFile;
  }
  public set importFile(val) {
    this._importFile = val;
    this.processImport();
  }

  private scheduleSelect: HTMLElement;

  public get student() {
    return this._student;
  }
  @Input('student')
  public set student(val: StudentClass) {
    if(this._student && this._student.studentId == val.studentId) {
      return;
    }
    this._student = val;
    this.readOnly = val.restrictions.schedules == AccessLevel.read;
    this.loadStudent(this._student);
  }

  constructor(private userService: UserService,
              private dateTimeService: DateTimeService) { }

  ngOnInit() {
  }

  async setLoading(val: boolean, text: string) {
    this.loadingText = text;
    this.loading = val;
  }
  async loadStudent(summary: StudentClass) {
    this.setLoading(true, 'Loading');
    this.currentCategory = null;
    this.student = await this.user.loadStudent(summary.studentId);
    this.scheduleCategories = this.student.schedules;
    await this.student.schedules.loaded;
    if(!this.currentCategory && this.scheduleCategories.length > 0) {
      this.onCategorySelected(this.scheduleCategories.getItem(0).name);
    } else {
      this.onCategorySelected('Create new schedule');
    }
    this.setLoading(false, '');
  }

  onCategorySelected(categoryName: string) {
    this.categoryName = categoryName;
    this.version = undefined;
    this.reloadCategoryAndVersion();
  }
  
  onCategorySelectedEvent(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.onCategorySelected(target.value);
  }
  
  onVersionChange(version: string) {
    this.version = moment(version);
    this.reloadCategoryAndVersion();
  }
  
  onVersionChangeEvent(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.onVersionChange(target.value);
  }

  reloadCategoryAndVersion() {
    if(this.categoryName as any === 'Create new schedule') {
      this.schedule = null;
      let name = 'Schedule';
      if(this.scheduleCategories.length > 0) {
        let code = 66;
        while(this.scheduleCategories.find(x => x.name === `${name} ${String.fromCharCode(code)}`)) {
          code++;
        }
        name = `${name} ${String.fromCharCode(code)}`;
      }

      const applyDays = [];
      for(let i = 1; i <= 5; i++) {
        if(this.isAvailable(this.daysOfWeek[i])) {
          applyDays.push(i);
        }
      }

      this.currentCategory = this.student.schedules.newCategory();
      this.schedule = this.currentCategory.newSchedule();
      this.errors = [{ titleError: '', startError: '', endError: '' }];
      this.scheduleName = '';
      this.fromDate = moment(); // Default to current day
    } else {
      this.currentCategory = this.scheduleCategories.find(x => x.name === this.categoryName);
      this.version = this.version? this.version : this.currentCategory.history[0].start;
      const versionString = (this.version ?? moment()).format('yyyy-MM-DD');
      this.onScheduleSelected(versionString);
    }
  }

  isAvailable(day: string): boolean {
    const offset = this.daysOfWeek.indexOf(day);

    return !this.student.schedules.find(s => s.applyDays.find(d => d === offset));
  }

  onScheduleSelected(event?: string) {
    if(!this.currentCategory) {
      return;
    }
    this.schedule = this.currentCategory.history.find(x => (x.startDate || undefined) === event);
    if(!this.schedule) {
      this.schedule = this.currentCategory.history[0];
      this.version = this.schedule.start;
    }
    this.scheduleName = this.schedule.startDate;
    this.errors = [];
    for(let i = 0; i < this.schedule.activities.length; i++) {
      this.errors.push({ titleError: '', startError: '', endError: '' });
    }

    const element = document.getElementById('scheduleselector');
    if(element) {
      element['value'] = this.scheduleName;
    }
  }

  daySelected(day: string) {
    const offset = this.daysOfWeek.indexOf(day);
    const index = this.schedule.applyDays.find(item => item === offset);
    return index >= 0;
  }

  dayClicked(day: string) {
    const offset = this.daysOfWeek.indexOf(day);
    const index = this.schedule.applyDays.findIndex(item => item === offset);
    if(index >= 0) {
      this.schedule.applyDays.splice(index, 1);
    } else {
      this.schedule.applyDays.push(offset);
    }
  }

  addNewActivity() {
    this.schedule.activities.push({
      title: '',
      startTime: '',
      endTime: ''
    });
    this.errors.push({ titleError: '', startError: '', endError: '' });
  }

  validateFields() {
    this.errors = this.schedule.validate();
    if(this.errors.find(e => e.titleError || e.startError || e.endError)) {
      alert('There are errors that need to be corrected before saving the schedule');
      return false;
    }
    
    return true;
  }

  async saveOnDate() {
    // Validate that schedule name is set
    if (!this.schedule.name || this.schedule.name.trim() === '') {
      alert('Schedule name is required');
      return;
    }

    // Validate activities
    if (!this.validateFields()) {
      return;
    }

    const name = this.schedule.name;
    const cat = this.currentCategory;
    cat.name = name;

    const startDate = this.fromDate? this.fromDate.clone() : moment();
    if(!this.schedule.start || this.schedule.start.isSame(startDate, 'day')) {
      this.schedule.start = startDate;
    } else {
      const schedule = this.schedule.clone();
      schedule.start = startDate;
      this.schedule.cancel();
      this.schedule = schedule;
    }
    this.categoryName = this.schedule.name;

    this.setLoading(true, 'Saving');
    try {
      await this.schedule.save();
    } catch (err) {
      alert(err.message || 'An error occurred while saving the schedule');
    }

    this.setLoading(false, 'Saving');
    this.showDatePickerDropdown = false;

    this.onScheduleSelected(this.schedule.name);
  }

  cancel() {
    this.schedule.cancel();
    if(this.schedule.isNew) {
      this.schedule = null;
    }
  }

  deleteActivity(activity: Activity) {
    const index = this.schedule.activities.findIndex(a => a === activity);
    if(index >= 0) {
      this.schedule.activities.splice(index, 1);
    }
  }

  async delete() {
    this.setLoading(true, 'Saving');

    try {
      await this.schedule.delete();
      
      if(this.currentCategory.history.length === 0) {
        if(this.scheduleCategories.length > 0) {
          this.onCategorySelected(this.scheduleCategories[0].name);
        } else {
          this.categoryName = '';
          this.currentCategory = null;
          this.onCategorySelected('Create new schedule');
        }
      } else {
        this.onScheduleSelected(this.currentCategory.history[0].startDate);
      }
    } catch (err) {
      alert(err);
    }
    this.setLoading(false, 'Saving');
  }

  private getText(element) {
    if(element.type == 'text') {
      return element.text;
    }

    if(element.elements) {
      return element.elements.map(x => this.getText(x)).join('\n');
    }
    return '';
  }
  private xmlToTable(contentStruct: any) {
    
    const retval = {
      headers: contentStruct.elements
                      .find(x => x.name == 'thead')
                      .elements[0].elements.map(x => this.getText(x)),
      rows: contentStruct.elements
              .find(x => x.name == 'tbody')
              .elements.map(x => {
                return x.elements.map(y => this.getText(y));
              })
    };

    return retval;
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

  private async processImport() {
    this._importContent = this.importFileElement.nativeElement.files[0];
    this._importContent.arrayBuffer();
    const filename: string = this.importFileElement.nativeElement.value.toLowerCase();

    let content;
    if(filename.endsWith('.docx')) {
      const contentString = await convertToHtml({ arrayBuffer: await this._importContent.arrayBuffer() });
      const contentStruct = parseXml(contentString.value);
      content = this.xmlToTable(contentStruct.elements[0]);
    } else if(filename.endsWith('.xlsx')) {
      try {
        const buffer = new Buffer(await this._importContent.arrayBuffer()).toString('base64');
        const data = readXlsx(buffer);
        const sheet = data.Sheets[data.SheetNames[0]];
        const rangeString = sheet['!ref'];
        const [start, end] = rangeString.split(':').map(x => this.getExcelSegments(x));
        const headers: string[] = [];
        for(let i = start.col; i <= end.col; i++) {
          headers[i] = sheet[this.getExcelCellCode(i, start.row)].w.toLowerCase();
        }
        const rows: string[][] = [];
        for(let i = start.row + 1; i <= end.row; i++) {
          rows[i - 2] = [];
          const row = rows[i - 2];
          for(let ii = start.col; ii <= end.col; ii++) {
            if(sheet[this.getExcelCellCode(ii, i)]) {
              row[ii] = sheet[this.getExcelCellCode(ii, i)].w;
            }
          }
        }

        content = {
          headers,
          rows: rows.filter(x => x[0]? true : false)
        };  
      } catch (err) {
        console.log(err);
      }
    }
    const activityOffset = content.headers.findIndex(x => x.toLowerCase().indexOf('activity') >= 0 || x.toLowerCase().indexOf('name') >= 0);
    const startOffset = content.headers.findIndex(x => x.toLowerCase().indexOf('start') >= 0 );
    const endOffset = content.headers.findIndex(x => x.toLowerCase().indexOf('end') >= 0);

    this.currentCategory = this.student.schedules.newCategory();
    this.schedule = this.currentCategory.newSchedule();
    this.schedule.activities = content.rows.map((x, i) => {
      const previousStart = i > 0 ? content.rows[i - 1][startOffset] : undefined;
      const previousEnd = i > 0 ? content.rows[i - 1][endOffset] : undefined;
      return {
        title: x[activityOffset], 
        startTime: this.dateTimeService.evaluateUserTime(x[startOffset], previousStart), 
        endTime: this.dateTimeService.evaluateUserTime(x[endOffset], previousEnd)
      };
    });
    this.schedule.name = '';
    this.schedule.applyDays = [];
    this.schedule.validate();
    this.errors = this.schedule.activities.map(x => ({ titleError: '', startError: '', endError: '' }));
    this.scheduleName = '';

    console.log(content);
    this.showLoadSchedule = false;
  }
}
