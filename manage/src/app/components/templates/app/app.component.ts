import { Component, Input, OnInit } from '@angular/core';
import { 
  UserService, AppTemplate, LicenseFeatures, StudentTemplate, StudentTemplateBehavior, UserClass
} from '@mytaptrack/web-common';

@Component({
    selector: 'app-manage-template',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class TemplateAppComponent implements OnInit {
  private _user: UserClass;
  public features: LicenseFeatures;
  private _template: AppTemplate;
  public working: AppTemplate;
  public saving: boolean;
  public studentBehaviors: StudentTemplateBehavior[];

  @Input() student: StudentTemplate;

  public get selected() {
    return this._template;
  }
  @Input() public set selected(val: AppTemplate) {
    this._template = val;
  }

  public get behaviorNames() {
    if(!this.studentBehaviors) {
      return [];
    }
    return this.studentBehaviors.map(x => x.name);
  }

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user.subscribe(x => {
      this._user = x;
    });
  }

  async load() {
    await this._user.loadLicense();
    this.features = this._user.licenseDetails.features;
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }
  async save() {
    this.setSaving(true);
    try {
      await this._template.save();
    } finally {
      this.setSaving(false);
    }
  }
  cancel() {
    this.selected.cancel();
  }
}
