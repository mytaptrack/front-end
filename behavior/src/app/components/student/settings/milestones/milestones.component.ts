import { Component, OnInit, Input } from '@angular/core';
import { 
  StudentClass, AccessLevel, MilestoneClass, moment, Moment
} from '../../../..';

@Component({
  selector: 'app-milestones',
  templateUrl: './milestones.component.html',
  styleUrls: ['./milestones.component.scss'],
  standalone: false
})
export class MilestonesComponent implements OnInit {
  public student: StudentClass;
  public get milestones() { return this.student.milestones; };
  public selected: MilestoneClass;
  public administrator: boolean;
  public loading: boolean;
  selectedDate: Moment;
  selectedDateHandler: string;

  constructor() { }

  @Input('student')
  public set setStudent(val: StudentClass) {
    this.student = val;
    if(!val) {
      return;
    }
    const restrictions = val.restrictions;
    this.administrator = restrictions && restrictions.milestones === AccessLevel.admin;

    val.milestones.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    this.setSelected(val.milestones.length > 0? val.milestones[0] : null);
  }

  ngOnInit(): void {
  }

  private async setLoading(val: boolean) {
    this.loading = val;
  }

  setSelected(val: MilestoneClass) {
    const date = new Date();
    this.selected = val ?? this.student.createMilestone({
      title: '',
      description: '',
      date: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
    });

    this.selectedDate = moment();
  }
  create() {
    this.setSelected(null);
  }

  isNew(): boolean {
    return this.selected.isNew;
  }

  isSaving = false;
  async setSaving(val: boolean) {
    this.isSaving = val;
  }

  async save() {
    this.setSaving(true);
    try {
      await this.selected.save();
    } catch(err) {
      console.log(err);
      alert(err.message);
    }
    this.setSaving(false);
  }

  cancel() {
    this.selected.cancel();
  }

  async remove() {
    if(!confirm(`Do you mean to delete ${this.selected.title}`)) {
      return;
    }

    this.setLoading(true);
    try {
      await this.selected.remove();
      if(this.student.milestones.length > 0) {
        this.setSelected(this.student.milestones[0]);
      } else {
        this.setSelected(null);
      }
    } catch (err) {
      console.log(err);
      alert(err.message);
    } finally {
      this.setLoading(false);
    }
  }
}
