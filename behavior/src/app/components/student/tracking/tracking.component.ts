import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  UserService, ViewerConfigService, StudentBehavior, 
  StudentBehaviorClass, StudentClass, StudentResponse, moment
} from '../../..';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrls: ['./tracking.component.scss'],
  animations: [
    trigger('slideDownUp', [
      transition(':enter', [style({ height: 0 }), animate(250)]),
      transition(':leave', [animate(250, style({ height: 0 }))]),
    ]),
  ],
  standalone: false
})
export class TrackingComponent implements OnInit {
  public hasIntervalWCompare?: boolean;
  public student: StudentClass;
  public behaviors: StudentBehaviorClass[];
  public intervalBehaviors: StudentBehaviorClass[];
  public eventBehaviors: StudentBehaviorClass[];
  private refreshInterval;
  public loading: boolean;
  public showDescription: boolean = true;
  public license: string;
  public showInterval: boolean = false;
  public intervalTrackedIds: string[] = [];
  private _intervalDuration: number = 5;
  public get intervalDuration() { return this._intervalDuration; }
  public set intervalDuration(val: number) {
    this._intervalDuration = val;
    localStorage.setItem(`intervalDuration_${this.student.studentId}`, val.toString());
  }

  private _intervalType: 'seconds' | 'minutes' = 'minutes';
  public get intervalType() { return this._intervalType; }
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
  public intervalDisplayTime: string;
  public intervalCalcPointer: any;
  public intervalFlashOn: boolean = false;
  private beepsound: HTMLAudioElement;
  public responses: StudentResponse[] = [];

  public get isMobile() {
    return this.viewerConfigService.isMobile;
  }

  constructor(
    private userService: UserService,
    private viewerConfigService: ViewerConfigService,
    private cd: ChangeDetectorRef) {
    this.loading = true;
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

  ngOnInit(): void {
    this.showDescription = !this.viewerConfigService.isMobile;
    this.setLoading(true);
    if(this.intervalPointer) {
      clearInterval(this.intervalPointer);
      this.intervalPointer = undefined;
    }
    this.intervalPointer = setInterval(() => {
      this.refreshStatusCheck();
    }, 500);

    this.userService.user.subscribe(user => {
      if(!user) {
        this.loading = true;
        this.student = undefined;
        this.behaviors = [];
        this.responses = [];
        return;
      }
      user.selectedStudent.subscribe(x => {
        if(!x) {
          return;
        }
        this.stopInterval();
        this.loading = true;
        this.student = x;
        this.hasIntervalWCompare = x.licenseDetails.features.intervalWBaseline;
        this._intervalAlign = this.getBoolStorageValue(`intervalAlign_${this.student.studentId}`, true);
        this._intervalFlash = this.getBoolStorageValue(`intervalFlash_${this.student.studentId}`, true);
        this._intervalTrackSpecific = this.getBoolStorageValue(`intervalTrackSpecific_${this.student.studentId}`, true);
        this.intervalTrackedIds = JSON.parse(this.getStringStorageValue(`intervalTrackedIds_${this.student.studentId}`, '[]'));
        this._intervalPlaySound = this.getBoolStorageValue(`intervalPlaySound_${this.student.studentId}`, false);
        this._intervalDuration = this.getNumberStorageValue(`intervalDuration_${this.student.studentId}`, 5);
        this._intervalType = this.getStringStorageValue(`intervalType_${this.student.studentId}`, 'minutes') as any;
        this.intervalBehaviors = null;
        this.license = x.license;
        this.behaviors = x.trackables.activeBehaviors;
        this.responses = x.trackables.activeResponses;
        this.eventBehaviors = this.behaviors.filter(x => !x.isDuration);
        this.refreshStatus();
      })
    });
  }

  private _nextRefresh: number;
  private _nextInterval: number;
  private _nextDisplayTime: number;
  refreshStatusCheck() {
    const now = Date.now();
    if(this._nextRefresh < now && this.behaviors.find(y => y.isDuration)) {
      this._nextRefresh = now + 30000;
      this.refreshStatus();
      this.cd.detectChanges();
    }
    if(this.intervalStart && this._nextInterval < now) {
      this._nextInterval = now + this._intervalDuration
      this.intervalStart = this.intervalStart.add(this._intervalDuration, 'milliseconds');
      this.processIntervalNotify();
      this.cd.detectChanges();
    }
    if(this.intervalStart && (!this._nextDisplayTime || this._nextDisplayTime < now)) {
      this._nextDisplayTime = now + 1000;
      let diff = moment().diff(this.intervalStart, 'seconds');
      if(diff == 0) {
        diff = this._intervalDuration / 1000;
      }
      this.intervalDisplayTime = `${Math.floor(diff / 60)}:${(Math.abs(diff % 60)).toString().padStart(2, '0')}`;
      this.cd.detectChanges();
    }
    return '';
  }

  ngOnDestroy() {
    if(this.intervalPointer) {
      clearInterval(this.intervalPointer);
    }
    if(this.intervalCalcPointer) {
      clearInterval(this.intervalCalcPointer);
    }
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }

  async refreshStatus() {
    this.student.trackables.refreshTrackingStatus();
    this.setLoading(false);
  }

  startInterval() {
    const duration = this.intervalDuration * (this.intervalType == 'minutes'? 60000 : 1000);
    this.intervalDisplayTime = '0:00';
    if(!this.intervalBehaviors) {
      this.intervalBehaviors = this.behaviors.filter(x => this.intervalTrackedIds.find(y => y == x.id));
      this.behaviors = this.behaviors.filter(x => !this.intervalBehaviors.find(y => y.id == x.id));
    }

    if(this.intervalAlign) {
      const time = new Date().getTime();
      const getToZero = (time % duration) * -1;
      this.intervalStart = moment(time).add(getToZero + duration, 'milliseconds');
      const diff = this.intervalStart.diff(moment(), 'milliseconds');
      this.intervalStart = this.intervalStart.add(duration * -1, 'milliseconds');
      setTimeout(() => {
        this.intervalStart = this.intervalStart.add(duration, 'milliseconds');
        this.startIntervalProcessing(duration);
        this.processIntervalNotify();
      }, diff);
    } else {
      this.intervalStart = moment();
      this.startIntervalProcessing(duration);
    }
  }

  stopInterval() {
    this.intervalStart = null;
    if(this.intervalBehaviors) {
      this.behaviors.push(...this.intervalBehaviors);
      this.intervalBehaviors = null;
    }
  }

  startIntervalProcessing(duration: number) {
    if(!this.intervalStart) {
      return;
    }

    this._nextInterval = Date.now() + duration;
    this._intervalDuration = duration;
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
  toggleIntervalTracked(behavior: StudentBehavior) {
    const index = this.intervalTrackedIds.findIndex(x => x == behavior.id);
    if(index >= 0) {
      this.intervalTrackedIds.splice(index, 1);
    } else {
      this.intervalTrackedIds.push(behavior.id);
    }

    localStorage.setItem(`intervalTrackedIds_${this.student.studentId}`, JSON.stringify(this.intervalTrackedIds));
  }

  async track(behavior: StudentBehaviorClass) {
    await behavior.trackEvent();
  }

  isIntervalTracked(behavior) {
    return true;
  }
}
