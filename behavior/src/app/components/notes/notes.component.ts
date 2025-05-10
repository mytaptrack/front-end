import { Component, OnInit, EventEmitter, Input, Output, Injectable } from '@angular/core';
import { ApiClientService } from '../../services';
import { StudentClass, QLStudentNote, Moment, moment } from '../../types';
import { v4 as uuid } from 'uuid';

@Injectable()
@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  standalone: false
})
export class NotesComponent implements OnInit {
  noteId: string = uuid();
  noteResult: QLStudentNote = null;
  notes: QLStudentNote[] = [];
  errorSaving: boolean = false;
  private _date: Moment = null;
  private _student: StudentClass;
  private _timeout: any = null;
  saving: boolean = false;
  unsavedChanges = false;
  private _refreshing: boolean = false;
  private _newNote: string = "";
  get newNote(): string { return this._newNote; }
  set newNote(val: string) {
    this._newNote = val;
    this.unsavedChanges = val != "";
    this.onUnsavedChange.emit(this.unsavedChanges);
    this.flagUpdate();
  }

  get refreshing() { return this._refreshing; }
  set refreshing(val: boolean) {
    this._refreshing = val;
    this.refreshChange.emit(val);
  }

  @Output() onUnsavedChange: EventEmitter<boolean> = new EventEmitter()
  @Output() refreshChange: EventEmitter<boolean> = new EventEmitter();

  @Input() textHeight: string;
  @Input() print: boolean = false;
  @Input() showPrevNotes: boolean = true;

  @Input()
  set student(value: StudentClass) {
    if(this._student !== value) {
      console.log('student id set', value?.studentId);
      this._student = value;

      this.load();
    }
  }
  get student() { return this._student; }

  @Input('date')
  set date(date: string) {
    const localDate = moment(date).local();
    if(!(this._date?.isSame(localDate, 'day'))) {
      this._date = localDate;
      this.load();
    }
  }
  get date() { return this._date.format('MM/DD/yyyy'); }

  constructor(private apiClient: ApiClientService) { }

  ngOnInit(): void {
    if(!this._date) {
      this.date = moment().format('MM/DD/yyyy');
    }

    this.updateNoteId();
  }

  ngOnDestroy() {
  }

  updateNoteId() {
    const id = uuid();
    this.noteId = id.toString();
  }

  flagUpdate() {
    if(this._timeout) {
      clearTimeout(this._timeout);
    }
    this._timeout = setTimeout(() => {
      this.save();
    }, 300);
  }

  async load() {
    if(!this._student || !this._date) {
      console.info("Cannot load notes as all info not present")
      return;
    }

    var dt = this._date.format('yyyy-MM-DD');
    var endDate = moment(this._date).add(1, 'day').format('yyyy-MM-DD');
    const ntresult = await this.apiClient.getQLNotes(this._student.studentId, dt, endDate);

    ntresult.sort((a, b) => { return b.dateEpoc - a.dateEpoc });
    ntresult.forEach(x => {
      x.date = moment(x.dateEpoc).format('MM/DD/yyyy hh:mm:ss a');
    });
    this.notes = ntresult;
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }

  async save(forceAlerts: boolean = true): Promise<boolean> {
    if(this.saving) {
      console.warn('Already in saving call, will wait for the next opportunity to save');
      return false;
    }

    this.setSaving(true);
    let retval = true;
    try {
      const date = moment();
      const note: QLStudentNote = {
        noteId: this.noteId,
        note: this.newNote,
        studentId: this._student.studentId,
        dateEpoc: date.toDate().getTime(),
        noteDate: moment(this.date).tz('GMT').startOf('day').toDate().getTime(),
        product: 'behavior',
        date: date.format("MM/DD/yyyy hh:mm:ss a")
      };
      this.noteResult = await this.apiClient.putQLNotes(note);
      this.errorSaving = false;
    } catch (err) {
      console.error(err);
      this.errorSaving = true;
      alert(err.message);
      retval = false;
    }

    this.setSaving(false);
    return retval;
  }

  endNote() {
    if(this.errorSaving) {
      alert('An error occurred while saving. Please click the save link above to save the note before ending the note.');
      return;
    }
    this.notes = [this.noteResult, ...this.notes];
    this._newNote = "";
    this.updateNoteId();
  }

  deleteNote(note: QLStudentNote) {
    const index = this.notes.findIndex(x => x.noteId == note.noteId);
    if(index >= 0) {
      this.notes.splice(index, 1);
    }
  }
}
