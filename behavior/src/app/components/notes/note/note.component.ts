import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { QLStudentNote } from '@mytaptrack/types';
import { ApiClientService } from '../../../services';
import { StudentClass, moment } from '../../../types';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  standalone: false
})
export class NoteComponent {
  private _timer: any;
  private _note: QLStudentNote;
  
  date: string;

  saving: boolean;
  hasSaved = false;

  private _noteTextArea: ElementRef;
  get noteTextArea() { return this._noteTextArea; }
  @ViewChild('noteText')
  set noteTextArea(val: ElementRef) {
    this._noteTextArea = val;
    this.onNoteChange();
  }

  @Input()
  student: StudentClass;

  get note() { return this._note; }
  @Input() set note(val: QLStudentNote) {
    this._note = val;
    if(val) {
      this.date = moment(val.dateEpoc).format('MM/DD/yyyy hh:mm:ss');
    }
  }
  
  get notes() { return this.note.note; }
  set notes(val: string) {
    if(val == this.note.note) {
      return;
    }

    this.note.note = val;
    this.onNoteChange();
    this.triggerSave();
  }

  @Output()
  onDelete: EventEmitter<NoteComponent> = new EventEmitter(false);

  constructor(private api: ApiClientService) {

  }

  ngOnInit() {
    setTimeout(() => {
      this.onNoteChange();
    }, 200)
  }

  triggerSave() {
    if(this._timer) {
      clearTimeout(this._timer);
    }

    this._timer = setTimeout(() => {
      this.save();
    }, 1000);
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }

  async delete() {
    if(confirm("Confirm to delete the note.")) {
      this.note.remove = true;
      if(await this.save()) {
        this.onDelete.emit(this);
      }
    }
  }

  async save(): Promise<boolean> {
    this.setSaving(true);
    try {
      // TODO: Add update call for
      await this.api.putQLNotes(this.note);
      this.hasSaved = true;
      return true;
    } catch (err) {
      console.error('Error while saving note', err);
      alert('There was an error while saving the note');
    } finally {
      this.setSaving(false);
    }
    return false;
  }

  onNoteChange() {
    var textElement = this.noteTextArea?.nativeElement;
    if(!textElement) {
      return;
    }
    textElement.style.height = "";
    textElement.style.height = textElement.scrollHeight + "px";
  }
}
