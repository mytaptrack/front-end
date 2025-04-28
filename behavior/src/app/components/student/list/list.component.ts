import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { 
  StudentSummary, StudentClass, TeamInviteClass, UserClass,
  UserService, moment
} from '../../..';
import { CreateComponent } from '../create/create.component';

@Component({
  selector: 'app-student-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  standalone: false
})
export class ListComponent implements OnInit {
  public user: UserClass;
  public acceptingAll: boolean = false;
  private _searchText: string;
  private _selectedStudent: StudentSummary = {} as any;
  private _filter: boolean = true;
  private _searchResults: StudentSummary[];
  private initialNull: boolean = false;
  public get students(): StudentSummary[] {
    const students = this.user?.students;
    if(this._searchResults) {
      return this._searchResults;
    }
    if(this._filter && this.user?.students) {
      return this.filteredStudents;
    }
    return students ?? []; 
  };
  public filteredStudents: StudentSummary[] = [];
  public oldStudents: StudentSummary[] = [];

  @Output('selected')
  private _selectedStudentEmitter = new EventEmitter<StudentSummary>();

  @Input('selectedStudent')
  public get selectedStudent() {
    return this._selectedStudent;
  }
  public set selectedStudent(val: StudentSummary) {
    this._selectedStudent = val;
    if(!val) {
      this._selectedStudentEmitter.emit(val);
      return;
    }
    this.user?.loadStudent(val.studentId);
    this._selectedStudentEmitter.emit(val);
  }

  public get searchText() {
    return this._searchText;
  }
  public set searchText(val: string) {
    this._searchText = val;
    this.getStudents();
  }

  public get showRecentlyActive() {
    return this.user?.students != this.students;
  }
  public set showRecentlyActive(val: boolean) {
    this.setStudentList(val);
  }

  public get hasHidenStudents() {
    if(!this.user.students || !this.filteredStudents) {
      return false;
    }
    return this.filteredStudents.length != this.user.students.length
  }

  constructor(
    private userService: UserService, 
    private dialog: MatDialog) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      this.processUser(user);
    });
  }

  private processUser(user: UserClass) {
    if(!user || this.user == user) {
      return;
    }
    this.user = user;
    
    const datedStudents = this.user.students.map(x => ({ lastTracked: x.lastTracked? moment(x.lastTracked) : '' as any as moment.Moment, student: x}));
    const cutoffPoint = moment();
    cutoffPoint.add(-30, 'days');
    let filteredStudents = datedStudents.length < 10 || !datedStudents.find(y => y.lastTracked)? datedStudents.map(x => x.student) : datedStudents.filter(x => x.lastTracked && x.lastTracked.isAfter(cutoffPoint)).map(x => x.student);
    if(!filteredStudents) {
      filteredStudents = [];
    }
    this.filteredStudents = filteredStudents;
    
    user.selectedStudent.subscribe(student => {
      if(!student) {
        this.selectedStudent = undefined;
        return;
      }
      if(!this.selectedStudent || this.selectedStudent.studentId != student.studentId) {
        if(!student) {
          this.selectedStudent = undefined;
          return;
        }
        this.selectedStudent = this.user.students.find(x => x.studentId == student.studentId);
      }
    });
    this._filter = false;
    this.user.studentsChanged.subscribe(students => {
      this.setStudentList(false);
    });
    this.initialNull = true;
  }

  async setStudentList(val: boolean) {
    if(this._filter != val) {
      this._filter = val;
      if(!this.selectedStudent && this.students.length > 0) {
        this.selectedStudent = this.students[0];
      }
    }
  }

  getNotificationCount(student: StudentSummary) {
    return student.alertCount;
  }

  async removeInvite(invite: TeamInviteClass) {
    await invite.decline();
  }

  getStudents() {
    if(!this.user) {
      return [];
    }

    if(!this.searchText) {
      delete this._searchResults;
      return;
    }

    this._searchResults = this.user.students.filter(x => {
      return `${x.firstName} ${x.lastName} ${x.tags.join(' ')}`.toLowerCase().indexOf(this.searchText.toLowerCase()) >= 0;
    });
  }

  isActiveNoResponse(student: StudentClass) {
    const summary = this.user.students.find(x => x.studentId == student.studentId);
    return summary.awaitingResponse;
  }

  getDate(date: string) {
    if(!date) {
      return 'No date found';
    }
    return moment(new Date(date)).format('MM-DD-yyyy');
  }

  async setAcceptingAll(val: boolean) {
    this.acceptingAll = val;
  }
  async acceptAllInvites() {
    this.setAcceptingAll(true);
    try {
      await this.user.acceptAllInvites();
    } finally {
      this.setAcceptingAll(false);
    }
  }

  createStudent() {
    this.dialog.open(CreateComponent, {
      data: {
        user: this.user
      }
    });
  }
}
