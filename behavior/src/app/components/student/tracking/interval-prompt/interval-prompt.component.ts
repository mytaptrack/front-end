import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { timer } from 'rxjs';
import { StudentClass, moment } from '../../../..';

@Component({
  selector: 'app-interval-prompt',
  templateUrl: './interval-prompt.component.html',
  styleUrls: ['./interval-prompt.component.scss'],
  standalone: false
})
export class IntervalPromptComponent implements OnInit, OnDestroy {
  @Input() student: StudentClass;

  @Input() public showInterval: boolean;
  @Input() public showDuration: boolean;
  public intervalTrackedIds: string[] = [];
  private _intervalDuration: number = 5;

  public get intervalDuration() { return this._intervalDuration; }
  @Input()
  public set intervalDuration(val: number) {
    this._intervalDuration = val;
    localStorage.setItem(`intervalDuration_${this.student.studentId}`, val.toString());
  }

  private _intervalType: 'seconds' | 'minutes' = 'minutes';
  public get intervalType() { return this._intervalType; }
  @Input()
  public set intervalType(val: 'seconds' | 'minutes') {
    this._intervalType = val;
    localStorage.setItem(`intervalType_${this.student.studentId}`, val);
  }
  public _intervalAlign: boolean = true;
  public get intervalAlign() { return this._intervalAlign; }
  public set intervalAlign(val: boolean) {
    this._intervalAlign = val;
    localStorage.setItem(`intervalAlign_${this.student.studentId}`, val.toString());
  }
  public intervalStart: moment.Moment;
  public intervalPointer: any;
  private _intervalPlaySound: boolean = false;
  public get intervalPlaySound() { return this._intervalPlaySound; }
  public set intervalPlaySound(val: boolean) {
    this._intervalPlaySound = val;
    localStorage.setItem(`intervalPlaySound_${this.student.studentId}`, val.toString());
  }
  private _intervalFlash: boolean = true;
  public get intervalFlash() { return this._intervalFlash; }
  public set intervalFlash(val: boolean) {
    this._intervalFlash = val;
    localStorage.setItem(`intervalFlash_${this.student.studentId}`, val.toString());
  }
  private _intervalTrackSpecific = false;
  public get intervalTrackSpecific() { return this._intervalTrackSpecific; }
  public set intervalTrackSpecific(val: boolean) {
    this._intervalTrackSpecific = val;
    localStorage.setItem(`intervalTrackSpecific_${this.student.studentId}`, val? 'true' : 'false');
  }
  @ViewChild("intervalDisplayTimeElement")
  public intervalDisplayTimeSpan: ElementRef;
  private _intervalDisplayTime: string;
  public get intervalDisplayTime() { return this._intervalDisplayTime; }
  public set intervalDisplayTime(val: string) {
    if(!this.intervalDisplayTimeSpan) {
      const doc = document.getElementById('intervalDisplayTimeElement');
      this.intervalDisplayTimeSpan = doc? new ElementRef(doc) : undefined;
    }
    if(this.intervalDisplayTimeSpan && this._intervalDisplayTime != val) {
      this._intervalDisplayTime = val;
      this.intervalDisplayTimeSpan.nativeElement.innerText = val;
    }
  }


  public intervalCalcPointer: any;
  public intervalFlashOn: boolean = false;
  private beepsound: HTMLAudioElement;
  private _nextRefresh: number;
  private _nextInterval: number;
  private _nextDisplayTime: number;

  constructor(
    private cd: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    try {
      this._intervalAlign = this.getBoolStorageValue(`intervalAlign_${this.student.studentId}`, true);
      this._intervalFlash = this.getBoolStorageValue(`intervalFlash_${this.student.studentId}`, true);
      this._intervalTrackSpecific = this.getBoolStorageValue(`intervalTrackSpecific_${this.student.studentId}`, true);
      this.intervalTrackedIds = JSON.parse(this.getStringStorageValue(`intervalTrackedIds_${this.student.studentId}`, '[]'));
      this._intervalPlaySound = this.getBoolStorageValue(`intervalPlaySound_${this.student.studentId}`, false);
      this._intervalDuration = this.getNumberStorageValue(`intervalDuration_${this.student.studentId}`, 5);
      this._intervalType = this.getStringStorageValue(`intervalType_${this.student.studentId}`, 'minutes') as any;
    } catch(e) {
      console.error(e);
    }

    if(this.intervalPointer) {
      clearInterval(this.intervalPointer);
      this.intervalPointer = undefined;
    }
    this.intervalPointer = timer(0, 200).subscribe(() => {
      this.refreshStatusCheck();
    });
  }

  ngOnDestroy(): void {
    if(this.intervalPointer) {
      this.intervalPointer = undefined;
    }
  }

  refreshStatusCheck() {
    const now = Date.now();
    if(this.intervalStart && this.intervalStart.isBefore(moment())) {
      if(this._intervalAlign) {
        const time = moment().toDate().getTime();
        const duration = this.intervalDuration * (this.intervalType == 'minutes'? 60000 : 1000);
        const getToZero = (time % duration) * -1;
        const zeroInterval = moment(time + getToZero);
        const diff = zeroInterval.diff(moment(), 'milliseconds');
        this.intervalStart = zeroInterval.clone().add(this.intervalDuration, this.intervalType);
        this.processIntervalNotify();
      } else {
        this.intervalStart = this.intervalStart.add(this.intervalDuration, this.intervalType);
        this.processIntervalNotify();
      }
      // this.cd.detectChanges();
    }
    if(this.intervalStart && (!this._nextDisplayTime || this._nextDisplayTime < now)) {
      this._nextDisplayTime = now + 200;
      let diff = this.intervalStart.diff(moment(), 'seconds');
      if(diff == 0) {
        diff = this._intervalDuration / 1000;
      }
      let displayTime = `${Math.floor(diff / 60)}:${(Math.floor(Math.abs(diff % 60))).toString().padStart(2, '0')}`;
      if(displayTime != this.intervalDisplayTime) {
        this.intervalDisplayTime = displayTime;
      }
      // this.cd.detectChanges();
    }
    return '';
  }

  startInterval() {
    const duration = this.intervalDuration * (this.intervalType == 'minutes'? 60000 : 1000);
    this.intervalDisplayTime = '0:00';

    if(this.intervalAlign) {
      const time = moment().toDate().getTime();
      const getToZero = (time % duration) * -1;
      const zeroInterval = moment(time + getToZero);
      const diff = zeroInterval.diff(moment(), 'milliseconds');
      this.intervalStart = zeroInterval.clone().add(this.intervalDuration, this.intervalType);
      setTimeout(() => {
        const time = moment().toDate().getTime();
        const getToZero = (time % duration) * -1;
        const zeroInterval = moment(time).add(getToZero, 'milliseconds');
        this.intervalStart = zeroInterval.add(this.intervalDuration, this.intervalType);
        this.startIntervalProcessing(duration);
        this.processIntervalNotify();
      }, diff);
    } else {
      this.intervalStart = moment().add(this.intervalDuration, this.intervalType);
      this.startIntervalProcessing(duration);
    }
  }

  stopInterval() {
    this.intervalStart = null;
  }

  startIntervalProcessing(duration: number) {
    if(!this.intervalStart) {
      return;
    }

    this._nextInterval = Date.now() + duration;
  }

  processIntervalNotify() {
    if(this.intervalFlash) {
      let intervalFlashCount = 10;
      let intervalFlashInterval = setInterval(() => {
        intervalFlashCount--;
        if(intervalFlashCount <= 0) {
          this.intervalFlashOn = false;
          clearInterval(intervalFlashInterval);
        } else {
          this.intervalFlashOn = intervalFlashCount % 2 == 1;
        }
      }, 250);
    }
    if(this.intervalPlaySound) {
      if(!this.beepsound) {
        this.beepsound = new Audio('assets/beep-07.mp3');
      }
      this.beepsound.play();
    }
  }

  getBoolStorageValue(name: string, defaultValue: boolean): boolean {
    const storedData = localStorage.getItem(name);
    if(!storedData) {
      return defaultValue;
    }
    return storedData == 'true';
  }
  getNumberStorageValue(name: string, defaultValue: number): number {
    const storedData = localStorage.getItem(name);
    if(!storedData) {
      return defaultValue;
    }
    return parseInt(storedData);
  }
  getStringStorageValue(name: string, defaultValue: string): string {
    const storedData = localStorage.getItem(name);
    if(!storedData) {
      return defaultValue;
    }
    return storedData;
  }
}
