import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { 
  ManageClass, StudentClass, UserClass
} from '../../lib';
import { UserService } from '../../services';
import { LicenseDetails } from '@mytaptrack/types';

@Component({
    selector: 'app-console',
    templateUrl: './console.component.html',
    styleUrls: ['./console.component.scss'],
    standalone: false
})
export class ConsoleComponent implements OnInit {
  public dedicatedLicenseCount: number;
  public flexLicenseCount: number;
  public loading = true;
  private user: UserClass;
  public management: ManageClass;
  public license: LicenseDetails;
  public dedicatedIds: string[];
  public students: StudentClass[];
  
  constructor(
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      this.user = user;
      if(!user) {
        return;
      }
      
      this.license = this.user.licenseDetails;
      this.management = user.management;
      if(!this.management) {
        return;
      }
      this.load();
    });
  }

  async load() {
    const [manageStudents, license] = await Promise.all([
      this.management.getStudents(),
      this.management.license
    ]);
    this.license = license;
    console.debug('manageStudents', manageStudents);
    this.students = manageStudents.students;
    this.dedicatedIds = this.students.filter(x => x.licenseDetails?.fullYear).map(x => x.studentId);
    this.dedicatedLicenseCount = this.dedicatedIds.length;
    this.flexLicenseCount = this.students.filter(x => x.licenseDetails?.flexible).length;
    
    this.loading = false;
  }

  getStudentName(studentId: string) {
    if(!this.user) {
      return studentId;
    }

    const student = this.students.find(x => x.studentId == studentId);
    if(!student) {
      return studentId;
    }

    return `${student.details.firstName} ${student.details.lastName}`;
  }

  async removeStudentLicense(studentId: string) {
    const student = this.students.find(x => x.studentId == studentId);
    student.applyLicense('No License');
    
    const index = this.dedicatedIds.findIndex(x => x == studentId);
    if(index >= 0) {
      this.dedicatedIds.splice(index, 1);
    }
  }
}
