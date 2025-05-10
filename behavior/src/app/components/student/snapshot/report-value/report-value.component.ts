import { Component, Input } from '@angular/core';
import { SnapshotConfig } from '../../../..';

const colors = [
  '#5dcf00',
  '#a0bf04',
  '#fce703',
  '#fcd303',
  '#fcb503',
  '#fc7b03',
  '#fc3903'
]

@Component({
  selector: 'app-report-value',
  templateUrl: './report-value.component.html',
  styleUrls: ['./report-value.component.scss'],
  standalone: false
})
export class ReportValueComponent {
  @Input() snapshotConfig: SnapshotConfig;
  @Input() faces: {
    face: string;
    overwrite?: boolean;
  }[];
  @Input() dayOffset: number;
  @Input() allowSelection: boolean;

  get face() {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return '';
    }
    let face = this.faces[this.dayOffset].face;
    if(face == 'smile') {
      face = this.snapshotConfig.measurements[0].name;
    }
    if(face == 'meh') {
      face = this.snapshotConfig.measurements[1].name;
    }
    if(face == 'frown') {
      face = this.snapshotConfig.measurements[2].name;
    }
    return face;
  }
  set face(val: string) {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return;
    }
    this.faces[this.dayOffset].face = val;
  }

  getStatusColor(text: string) {
    const item = this.snapshotConfig.measurements.find(x => x.name == text);

    if(!item) {
      return '';
    }
    const colorOffset = item.order / this.snapshotConfig.measurements.length * colors.length;
    return colors[Math.floor(colorOffset)];
  }
  getFaceColor() {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return '';
    }
    let face = this.faces[this.dayOffset].face;
    if(face == 'smile') { face = this.snapshotConfig.measurements[0].name; }
    if(face == 'meh') { face = this.snapshotConfig.measurements[1].name; }
    if(face == 'frown') { face = this.snapshotConfig.measurements[2].name; }
    return this.getStatusColor(face);
  }
  getStatusName() {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return '';
    }
    let face = this.faces[this.dayOffset].face;
    if(face == 'smile') {
      face = this.snapshotConfig.measurements[0].name;
    }
    if(face == 'meh') {
      face = this.snapshotConfig.measurements[1].name;
    }
    if(face == 'frown') {
      face = this.snapshotConfig.measurements[2].name;
    }
    return face;
  }
  isTextFace(val: string) {
    let face = val;
    if(face == 'smile') {
      face = this.snapshotConfig.measurements[0].name;
    }
    if(face == 'meh') {
      face = this.snapshotConfig.measurements[1].name;
    }
    if(face == 'frown') {
      face = this.snapshotConfig.measurements[2].name;
    }
    return face.startsWith('@');
  }
  isFace() {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return '';
    }

    let face = this.faces[this.dayOffset].face;
    if(face == 'smile') {
      face = this.snapshotConfig.measurements[0].name;
    }
    if(face == 'meh') {
      face = this.snapshotConfig.measurements[1].name;
    }
    if(face == 'frown') {
      face = this.snapshotConfig.measurements[2].name;
    }
    let hasAt = face.startsWith('@');
    return hasAt;
  }
  getFace() {
    if(!this.faces || !this.faces[this.dayOffset]) {
      return '';
    }
    
    let face = this.faces[this.dayOffset].face;
    if(face.startsWith('@')) {
      face = face.slice(1);
    }

    return `fa-${face}-o`;
  }


  getFaceFromText(val: string) {
    if(!val) {
      return '';
    }
    
    let face = val.slice(1);

    if(face == 'smile') {
      return 'mood';
    } else if(face == 'meh') {
      return 'sentiment_neutral';
    } else if(face == 'frown') {
      return 'sentiment_dissatisfied';
    }

    return face;
  }
  setFace(value: string) {
    if(!this.faces) {
      return '';
    }
    if(!this.faces[this.dayOffset]) {
      this.faces[this.dayOffset] = { face: '' };
    }
    this.faces[this.dayOffset].face = value;
  }
}
