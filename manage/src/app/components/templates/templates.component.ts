import { Component, OnInit } from '@angular/core';
import { 
  ManageClass, ManageTemplates, StudentTemplate, 
  
} from '../../lib';
import { LicenseFeatures, StudentTemplateBehavior } from '@mytaptrack/types';
import { UserService } from '../../services'

@Component({
    selector: 'app-templates',
    templateUrl: './templates.component.html',
    styleUrls: ['./templates.component.scss'],
    standalone: false
})
export class TemplatesComponent implements OnInit {
  studentBehaviors: StudentTemplateBehavior[];
  studentTemplates: StudentTemplate[];
  selected: StudentTemplate;
  loading = true;
  features: LicenseFeatures;
  
  private _manage: ManageClass;
  private _manageTemplates: ManageTemplates;

  constructor(
    private userService: UserService) { 

  }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      if(!user) {
        return;
      }
      this._manage = user.management;
      this.load();
    })
  }

  async load() {
    const [license] = await Promise.all([
      this._manage.getLicense()
    ]);
    this.features = license.features;
    this._manageTemplates = await this._manage.getTemplates();
    this.studentTemplates = this._manageTemplates.students;
    
    if(this.studentTemplates.length == 0) {
      this.selected = this._manageTemplates.addNewTemplate();
    } else {
      this.selected = this.studentTemplates[0];
    }

    this.loading = false;
  }

  createNewStudent() {
    this.selected = this._manageTemplates.addNewTemplate();
    ;
  }
  setSelected(val: StudentTemplate) {
    this.selected = val;
  }
  studentRemoved() {
    if(this.studentTemplates.length == 0) {
      this.selected = this._manageTemplates.addNewTemplate();
    } else {
      this.selected = this.studentTemplates[0];
    }
  }
}
