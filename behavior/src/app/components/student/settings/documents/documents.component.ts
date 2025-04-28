import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { 
  MttDocuments, AccessLevel, LicenseFeatures, StudentClass, 
  UserSummaryRestrictions, ApiClientService, moment
} from '../../../..';
import * as _ from 'lodash';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.scss'],
  standalone: false
})
export class DocumentsComponent implements OnInit {
  readonly: boolean;
  student: StudentClass;
  features: LicenseFeatures;
  restrictions: UserSummaryRestrictions;
  documents: MttDocuments;
  saving: boolean;
  loading: boolean;

  documentName: string;
  start: string;
  stop: string;
  isDragging = false;

  @ViewChild('importFileElement') public importFileElement: ElementRef;
  private _importFile: any;
  public get importFile() {
    return this._importFile;
  }
  public set importFile(val: any) {
    this._importFile = val;
    this.loadImportFile();
  }

  @Input('student')
  set setStudent(val: StudentClass) {
    this.setLoading(true);
    this.readonly = true;
    if(this.student?.studentId == val?.studentId) {
      this.documents = undefined;
      this.setLoading(false);
      return;
    }
    this.student = val;
    this.readonly = val.restrictions.documents == AccessLevel.read;
    this.features = val?.licenseDetails?.features;
    this.load();
  }
  @Input('restrictions')
  set setRestrictions(val: UserSummaryRestrictions) {
    this.restrictions = val;
  }

  get valid() { 
    if(this.importFileElement?.nativeElement.value) {
      return true;
    }
    return false;
  }

  constructor(private api: ApiClientService, private http: HttpClient) { }

  ngOnInit(): void {
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }
  async load() {
    try {
      const documents = await this.student.getDocuments();
      this.documents = documents;
    } finally {
      this.setLoading(false);
    }
  }

  async setSaving(val: boolean) {
    this.saving = val;
  }

  async loadImportFile() {
    this.setSaving(true);
    try {
      const importContent = this.importFileElement.nativeElement.files[0];
      let filename: string = this.importFileElement.nativeElement.value.toLowerCase();
      filename = filename.substring(filename.lastIndexOf('\\') + 1);

      const dateString = moment().format("yyyy-MM-DD");

      await this.documents.upload(filename, dateString, dateString, importContent);
      
      this.start = undefined;
      this.stop = undefined;
      this.importFileElement.nativeElement.value = '';
    } catch (err) {
      console.error(err.message);
    } finally {
      this.setSaving(false);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Handle the dropped file(s)
      const file = files[0]; // Handle first file
      
      // Set the file to the input element
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Create a new DataTransfer object and add the file
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      // Set the input's files
      if (fileInput) {
        fileInput.files = dataTransfer.files;
        
        // Trigger file validation if needed
        fileInput.dispatchEvent(new Event('change'));
      }
    }
  }
}
