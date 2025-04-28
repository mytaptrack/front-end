import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import { ManageClass, StudentClass, UserClass } from '../../lib';
import { UserService } from '../../services';

class TagValue {
  private _value: string;
  get id() { 
    const retval = this.tag.id + '-' + this._value?.replace(/\W/g, '-'); 
    return retval;
  }
  get value() { return this._value; }
  students: StudentClass[];
  get studentCount() { return this.students.length; }
  deleting: boolean;

  constructor(private tag: Tag, value: string, student: StudentClass) {
    this._value = value ?? '';
    this.students = [];

    if(student) {
      this.students.push(student);
    }
  }

  async setDeleting(val: boolean) {
    this.deleting = val;
  }

  async delete() {
    this.setDeleting(true);
    try {
      await Promise.all(this.students.map(async x => {
        x.tags = x.tags.filter(y => {
          if(!this.value) {
            return y !== this.tag.name
          }
          return y !== this.tag.name + ':' + this.value;
        });
        await x.save();
      }));
      this.students = [];
    } finally {
      this.setDeleting(false);
    }
  }

  sort() {
    this.students.sort((a, b) => {
      const aName = a.details.firstName + ' ' + a.details.lastName;
      const bName = b.details.firstName + ' ' + b.details.lastName;
      return aName.localeCompare(bName);
    });
  }
}

class Tag {
  get id() { return this.name.replace(/\W/g, '-'); }
  name: string;
  values: TagValue[];
  deleting: boolean;

  get studentCount() {
    return this.values.reduce((acc, x) => acc + x.students.length, 0);
  }

  constructor(name: string) {
    this.name = name;
    this.values = [];
  }

  async setDeleting(val: boolean) {
    this.deleting = val;
  }
  async delete() {
    this.setDeleting(true);
    try {
      for(let val of this.values) {
        await val.delete();
      }  
    } finally {
      this.setDeleting(false);
    }
  }

  sort() {
    this.values.sort((a, b) => {
      return a.value.localeCompare(b.value);
    });
    this.values.forEach(x => x.sort());
  }
}

@Component({
  selector: 'app-tag-management',
  templateUrl: './tag-management.component.html',
  styleUrls: ['./tag-management.component.scss'],
  standalone: false
})
export class TagManagementComponent implements OnInit {
  public user: UserClass;
  public manage: ManageClass;
  public students: StudentClass[];
  public tags: Tag[] = [];
  displayTags: string[] = [];
  displayTagsSaving = false;
  false = false;
  
  constructor(private userService: UserService) { }

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

    students.students.forEach(student => {
      if(!student.tags || student.tags.length === 0) {
        this.processTag('No Tags', '', student);
        return;
      }
      student.tags.forEach(studentTag => {
        const [name, value] = studentTag.split(':');
        
        this.processTag(name, value, student);
      });
    });
    this.tags.sort((a, b) => a.name.localeCompare(b.name));
    this.tags.forEach(x => x.sort());

    this.displayTags = license.features?.displayTags?.sort((a, b) => a.order - b.order).map(x => x.tagName) ?? [];
  }

  processTag(name: string, value: string, student: StudentClass) {
    if(!value) { value = ''; }
    let tag = this.tags.find(x => x.name == name);
    if(!tag) {
      tag = new Tag(name);
      this.tags.push(tag);
    }

    const tagValue = tag.values.find(x => x.value.toLowerCase() == value.toLowerCase());
    if(!tagValue) {
      tag.values.push(new TagValue(tag, value, student));
    } else {
      if(!tagValue.students.find(x => x.studentId == student.studentId)) {
        tagValue.students.push(student);
      }
    }
  }
  async removeStudentFromTag(student: StudentClass, tag: Tag, val: TagValue) {
    const index = student.tags.findIndex(x => x.startsWith(tag.name + ':'));
    if(index < 0) {
      return;
    }
    student.tags.splice(index, 1);
    await student.save();
    const studentIndex = val.students.findIndex(s => s.studentId == student.studentId);
    val.students.splice(studentIndex, 1);
  }

  async setDisplayTagsSaving(val: boolean) {
    this.displayTagsSaving = val;
  }
  async saveDisplayTags() {
    this.setDisplayTagsSaving(true);
    try {
      await this.manage.putDisplayTags(this.displayTags);
    } finally {
      this.setDisplayTagsSaving(false);
    }
  }
}
