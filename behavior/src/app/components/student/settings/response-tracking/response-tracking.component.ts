import { Component, Input, OnInit } from '@angular/core';
import { 
  StudentClass, AccessLevel, StudentResponseClass, 
  StudentTemplate, StudentTemplateBehaviorClass, UserSummaryRestrictions
} from '../../../..';

@Component({
  selector: 'app-response-tracking',
  templateUrl: './response-tracking.component.html',
  styleUrls: ['./response-tracking.component.scss'],
  standalone: false
})
export class ResponseTrackingComponent implements OnInit {
  public get activeResponses() { return this.student.trackables.activeResponses; }
  public archivedResponses: (StudentResponseClass|StudentTemplateBehaviorClass)[];
  private _selected: StudentResponseClass|StudentTemplateBehaviorClass;
  public student: StudentClass | StudentTemplate;
  public restrictions: UserSummaryRestrictions;
  public administrator: boolean;
  public behaviorIdSelected: string = '';
  public loading = false;
  public saving = false;
  public status: string = '';

  public get selected() {
    return this._selected;
  }
  public set selected(value: StudentResponseClass | StudentTemplateBehaviorClass) {
    this._selected = value;
  }

  public get isManaged() {
    const retval = this._selected instanceof StudentTemplateBehaviorClass;
    return retval;
  }

  constructor() { }

  ngOnInit(): void {
  }

  @Input('student')
  public set setStudent(val: StudentClass | StudentTemplate) {
    this.student = val;
    if(!val) {
      return;
    }
    this.restrictions = val.restrictions;
    this.administrator = this.restrictions.behavior === AccessLevel.admin;
    this.archivedResponses = this.student.trackables.archivedResponses;

    if(this.activeResponses.length > 0) {
      this.selected = this.activeResponses[0];
    } else if(this.archivedResponses.length > 0) {
      this.selected = this.archivedResponses[0];
    } else {
      this.selected = null;
    }
  }

  private async setLoading(val: boolean) {
    this.loading = val;
  }
  private async setSaving(val: boolean) {
    this.saving = val;
  }

  public getBehaviorName(behaviorId: string) {
    return this.student.trackables.getBehaviorName(behaviorId);
  }

  async create() {
    this.selected = await this.student.trackables.addResponse();
  }
  cancel() {
    this.selected.cancel();
  }

  async archive() {
    if(this._selected instanceof StudentTemplateBehaviorClass) {
      this._selected.delete();
      if(this.student.trackables.responses.length > 0) {
        this._selected = this.student.trackables.responses[0];
      } else {
        this._selected = null;
      }
      return;
    }
    this.setLoading(true);
    try {
      await this._selected.archive(true);
    } finally {
      this.setLoading(false);
    }
  }
  
  async reactivate() {
    this.setLoading(true);
    try {
      await this._selected.archive(false);
    } finally {
      this.setLoading(false);
    }
  }

  async save() {
    if(this.restrictions.behavior !== AccessLevel.admin) {
      alert('You are not authorized to make this change');
      return;
    }
    this.setSaving(true);
    try {
      await this._selected.save();

      this.selected = this._selected;
      this.archivedResponses = this.student.trackables.archivedResponses;
    } catch (err) {
      alert(err.message);
    } finally {
      this.setSaving(false);
    }
  }
}
