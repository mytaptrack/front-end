import { Component, Inject, OnInit } from '@angular/core';
import { 
  StudentBehavior, StudentDetails, StudentResponse, 
  TeamRole, UserService, StudentClass, UserClass,
  moment
} from '../../..';
import { ActivatedRoute, Router } from '@angular/router';
import * as uuid from 'uuid';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  standalone: false
})
export class CreateComponent implements OnInit {
  public studentObject: StudentClass;
  public get student(): StudentDetails { return this.studentObject?.details; }
  public role: string;
  public roles: string[];
  public roleError: string;
  public firstNameError: string;
  public lastNameError: string;
  public loading: boolean;
  public user: UserClass;
  public get userStudents() { return this.user?.students ?? []; }
  public copyOtherBehaviors: boolean = false;
  public copyOtherStudent: string;
  public _licenseType: 'No License' | 'Single' | 'Multi' | 'Other' | '';

  public get licenseType() {
    if(this._licenseType) {
      return this._licenseType;
    }
    if(!this.studentObject || !this.studentObject.license ||
      !this.studentObject.licenseDetails || 
      (
        !this.studentObject.licenseDetails.fullYear &&
        !this.studentObject.licenseDetails.flexible
      )) {
      return 'No License';
    }
    if(this.user && this.user.license && 
      this.studentObject.license !== this.user.license) {
      return 'Other';
    }
    if(this.studentObject.licenseDetails.fullYear) {
      return 'Single';
    }
    return 'Multi';
  }
  public set licenseType(val: 'No License' | 'Single' | 'Multi' | 'Other' | '') {
    this._licenseType = val;
  }

  public get allowConvertLicense() {
    if(!this.user || !this.user.license || !this.student) {
      return false;
    }
    if(!this.studentObject.studentId) {
      return false;
    }
    if(this.studentObject.license == this.user.license) {
      if(!this.studentObject.licenseDetails.fullYear) {
        return true;
      }
      return true;
    }

    if(this.studentObject.restrictions.transferLicense) {
      return true;
    }
    return true;
  }

  constructor(
    public dialogRef: MatDialogRef<CreateComponent>,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(MAT_DIALOG_DATA) params: { student: StudentClass | undefined }
    ) 
  {
    this.studentObject = params.student;

    if(!params.student) {
      return;
    }
    this.copyOtherBehaviors = false;
    
    this.sortTags();

    if(params.student.details.nickname === undefined) {
      params.student.details.nickname = '';
    }

    this.role = this.role? this.role : 'Administrator';
  }

  ngOnInit() {
    this.roles = Object.keys(TeamRole).map(r => TeamRole[r]);
    this.load();
  }

  async setLoading(loading: boolean) {
    this.loading = loading;
  }

  sortTags() {
    if(this.studentObject.tags) {
      this.studentObject.tags.sort((a, b) => a.localeCompare(b));
    }
  }

  async load() {
    this.userService.user.subscribe(user => {
      this.user = user;
      if(!user) {
        return;
      }

      const params = this.route.snapshot.queryParams;
      if (!params.studentId) {
        this.studentObject = this.user.createStudent();
      }
      this._licenseType = '';
      this.setLoading(false);

      user.loadLicense();
    });
  }

  allValid() : boolean {
    if (!this.student.firstName || this.student.firstName.trim() == '') {
      return false;
    }
    if (!this.student.lastName || this.student.lastName.trim() == '') {
      return false;
    }

    return true;
  }

  evaluateStudentItem(studentItem: StudentDetails) {
    let error = false;
    this.firstNameError = null;
    this.lastNameError = null;
    this.roleError = null;
    if (studentItem.firstName.trim() == '') {
      error = true;
      this.firstNameError = 'First Name should not be empty';
    } else if (!/.*\w.*/.test(studentItem.firstName)) {
      error = true;
      this.firstNameError = 'First Name should only contain alphanumeric characters';
    }
    if (studentItem.lastName.trim() == '') {
      error = true;
      this.lastNameError = 'Last Name should not be empty';
    } else if (!/.*\w.*/.test(studentItem.lastName)) {
      error = true;
      this.lastNameError = 'Last Name should only contain alphanumeric characters';
    }

    if (this.role.trim() == '') {
      error = true;
      this.roleError = 'Role should not be empty';
    }

    if(!this.studentObject.studentId &&
      this.user.students &&
      this.user.students.find(x => (!this.studentObject || x.studentId != this.studentObject.studentId) && x.firstName == studentItem.firstName && x.lastName == studentItem.lastName)) {
        error = true;
        alert('A student with this name already exists on your student roster');
    }

    return error;
  }

  async create() {
    if (this.evaluateStudentItem(this.student)) {
      return;
    }
    if(!this.allValid()) {
      alert('Not all fields have been filled out');
      return;
    }

    this.setLoading(true);
    try {
      const student = this.studentObject;
      await student.save();
      if(this.copyOtherBehaviors && this.copyOtherStudent) {
        const otherStudent = await this.user.loadStudent(this.copyOtherStudent);
        console.log('Other Student', otherStudent.trackables.behaviors);
        const behaviorIdMap = {} as any;
        
        for(let behavior of otherStudent.trackables.behaviors.filter(x => !x.isArchived)) {
          const existing = student.trackables.behaviors.find(x => x.name == behavior.name);
          if(existing) {
            console.log('Behavior found', existing.id);
            behaviorIdMap[behavior.id] = existing.id;
            continue;
          }

          console.log('Adding behavior copy');
          const copy = {
            daytime: behavior.daytime,
            desc: behavior.desc,
            isDuration: behavior.isDuration,
            name: behavior.name,
            requireResponse: behavior.requireResponse
          } as StudentBehavior;
          const response = await student.trackables.addBehavior(copy);
          await response.save();
          behaviorIdMap[behavior.id] = response.id;
        }

        console.info('Evaluating responses');
        if(otherStudent.trackables.responses.length > 0) {
          for(let response of otherStudent.trackables.responses) {
            if(student.trackables.responses.find(y => y.name == response.name)) {
              continue;
            }
            const appliedToBehaviors = response.appliedToBehaviors.map(y => ({ behaviorId: behaviorIdMap[y.behaviorId], stopDuration: y.stopDuration }));
            const copy = {
              daytime: response.daytime,
              id: uuid.v4().toString(),
              desc: response.desc,
              isDuration: response.isDuration,
              name: response.name
            } as StudentResponse;
            student.trackables.addResponse(copy);
          }
        }

        student.save();

        const devices = await otherStudent.getDevices();
        if(devices) {
          console.log('Details', student);
          await Promise.all(devices.apps.map(async x => {
            const newDevice = await devices.addApp(x.deviceName);
            newDevice.deviceId = x.deviceId;
            newDevice.studentId = student.studentId;
            newDevice.studentName = student.details.firstName + ' ' + student.details.lastName;
            newDevice.events = x.events.map((y, i) => ({
              eventId: this.studentObject.trackables.behaviors.find(z => {
                const otherBehavior = otherStudent.trackables.behaviors.find(a => a.id == y.eventId);
                return otherBehavior?.name == z.name
              })?.id,
              track: y.track,
              abc: y.abc,
              order: y.order != undefined? y.order : i
            })).filter(x => x.eventId);
            await newDevice.save();
          }))
        }

        const otherSubs = await otherStudent.getSubscriptions();
        const resultSubs = await student.getSubscriptions();
        if(otherSubs.items.length > 0) {
          otherSubs.items.map(async sub => {
            if(resultSubs.items.find(x => x.name == sub.name)) {
              return;
            }
            const copy = resultSubs.create();
            copy.name = sub.name;
            copy.deviceIds = sub.deviceIds;
            copy.behaviorIds = this.studentObject.trackables.behaviors.map(x => otherStudent.trackables.behaviors.find(y => x.name == y.name).id);
            copy.responseIds = this.studentObject.trackables.responses.map(x => otherStudent.trackables.responses.find(y => x.name == y.name).id);
            copy.emails = sub.emails;
            copy.mobiles = sub.mobiles;
            copy.userIds = sub.userIds;
            copy.notifyUntilResponse = sub.notifyUntilResponse;
            copy.messages = sub.messages;
          });
          resultSubs.save();
        }
      }
      await student.applyLicense(this.licenseType);

      await this.user.loadStudent(this.studentObject.studentId);

      await this.router.navigate(['student/settings'], {
        queryParams: {
          studentId: this.studentObject.studentId
        }
      });

      window.location.reload();
    } catch (err) {
      console.log(err);
      alert(err.message);
      this.setLoading(false);
    }
  }

  hasSingleLicense() {
    if(this.studentObject.license && this.user.license && 
      this.studentObject.license == this.user.license) {
      if(this.studentObject.licenseDetails.fullYear) {
        return false;
      }
    }
    return this.user.license && this.user.licenseDetails &&
      this.user.licenseDetails.singleCount - this.user.licenseDetails.singleUsed > 0 &&
      moment().isBefore(moment(this.user.licenseDetails.expiration));
  }

  hasMultiLicense() {
    if(this.studentObject.license && this.user.license && 
      this.studentObject.license == this.user.license) {
      if(this.studentObject.licenseDetails.fullYear) {
        return false;
      }
    }
    return this.user.license && this.user.licenseDetails &&
      this.user.licenseDetails.multiCount > 0 &&
      moment().isBefore(moment(this.user.licenseDetails.expiration));
  }
}