import { Component, Input, OnInit } from '@angular/core';
import { UserSummaryRestrictions } from '@mytaptrack/types';
import { 
  StudentBehaviorClass, StudentTemplateBehaviorClass,
  TargetItemValues, TargetsClass
} from '../../../../../lib';
import {
  AccessLevel, LicenseFeatures, MeasurementType, StudentBehaviorTargetMax, 
  StudentBehaviorTargetMin, 
} from '@mytaptrack/types';
import { environment } from '../../../../../../environments/environment';

class TargetMeasurement {
  error: boolean;

  get name() {
    return this.target.name;
  }

  private _duration: string;
  get duration() {
    return this._duration;
  }
  set duration(val: string) {
    this._duration = val;
    this.generateTimeValue();
  }

  get frequency() {
    return this.target.value;
  }
  set frequency(val: number) {
    this.target.value = val;
  }

  constructor(private target: { name: string, value: number}) {
    this._duration = TargetsClass.getDuration(target.value);
    if(this._duration.indexOf('NaN') >= 0) {
      this._duration = '00:00';
      this.error = true;
    }
  }

  generateTimeValue() {
    const parts = this._duration.split(':');
    try {
      let outcome = 0;
      parts.forEach((seg, index) => {
        const offset = parts.length - index - 1;
        let multiplier = 1;
        for(let i = 0; i < offset; i++) {
          multiplier *= 60;
        }
        if(seg.length > 0) {
          const parsed = Number.parseInt(seg) * multiplier;
          if(Number.isNaN(parsed)) {
            throw new Error('Not a number');
          }
          outcome += parsed;  
        }
      });
      this.target.value = outcome;
      this.error = false;
    } catch(err) {
      this.error = true;
    }
  }
}

class TargetProperty {
  private _value: string;
  private _progress: string;
  private _behaviorId: string;
  private _measurement: TargetMeasurement[];
  public administrator: boolean;
  private error = false;
  public progressError = false;

  private get targets(): TargetItemValues {
    if(!this.parent || !this.parent.selected) {
      return undefined;
    }
    return this.parent.selected.targetGoals[this.prop];
  }
  private set targets(val: TargetItemValues) {
    if(!this.parent.selected) {
      return;
    }
    if(this.isDuration) {
      this.parent.selected.targetGoals[this.prop as string] = val;
    } else {
      this.parent.selected.targetGoals[this.prop as string] = val;
    }
  }

  constructor(private parent: BehaviorComponent, 
              private prop: 'frequency' | 'duration',
              private isDuration: boolean) {
    this._measurement = this.targets?.measurements.map((m) => new TargetMeasurement(m));
  }

  resetValues() {
    if(this.targets) {
      this._value = this.targets.target.toString();
    } else {
      this._value = '';
    }
  }

  public get show(): boolean {
    if(this.targets) {
      return true;
    }
    return false;
  }
  public set show(val: boolean) {
    if(val && !this.targets) {
      this.parent.selected.targetGoals.addTarget(this.prop);
      this._measurement = this.targets?.measurements.map((m) => new TargetMeasurement(m));
    }
    if(!val && this.targets) {
      this.targets = undefined;
    }
  }

  public get showLegend() {
    if(this.targets.measurements[0].value != this.targets.measurements[1].value &&
      !this.targets.measurements.find((x, i) => x.value == undefined && i != this.targets.measurements.length - 1)) {
      return true;
    }
    return false;
  }

  public get greenYellowSymbol() {
    if(!this.targets) {
      return '';
    }
    const target = this.targets;
    if(target.progress == undefined) {
      return '';
    }

    if(target.target < target.progress) {
      return 'or less';
    }

    if(target.target > target.progress) {
      return 'or more';
    }

    return '';
  }

  public get redSymbol() {
    if(this.greenYellowSymbol == 'or more') {
      return 'less than';
    }
    if(this.greenYellowSymbol == 'or less') {
      return 'more than';
    }

    return '';
  }

  public get measurement(): MeasurementType {
    if(!this.targets) {
      return MeasurementType.event;
    }

    return this.targets.measurement;
  }

  public set measurement(val: MeasurementType) {
    if(!this.targets) {
      return;
    }

    this.targets.measurement = val;
  }

  getCategoryValue(category: string) {
    let measurement = this._measurement?.find(x => x.name == category);
    if(!measurement) {
      const cat = { name: category, value: 0 };
      this.targets.measurements.push(cat);
      measurement = new TargetMeasurement(cat);
      this._measurement.push(measurement);
    }
    return measurement;
  }
  getCategoryColor(category: string) {
    return '#000000';
  }
}

@Component({
  selector: 'app-behavior',
  templateUrl: './behavior.component.html',
  styleUrls: ['./behavior.component.scss'],
  standalone: false
})
export class BehaviorComponent implements OnInit {
  public get hasIntervalWCompare() {
    return this.features.intervalWBaseline == true;
  };
  public get hasAbc() {
    return this.features.abc == true;
  }
  public frequencyTarget: TargetProperty;
  public durationTarget: TargetProperty;
  public administrator: boolean;
  public loading: boolean;
  public get onlyShowDelete() { return this.selected instanceof StudentTemplateBehaviorClass; }
  private _selected: StudentBehaviorClass | StudentTemplateBehaviorClass;
  public get selected() { return this._selected; }
  @Input()
  public set selected(val : StudentBehaviorClass | StudentTemplateBehaviorClass) {
    if(this._selected != val) {
      const prev = this._selected;
      this._selected = val;

      if(prev != null && val != null) {
        this.ngOnInit();
      }
    }
  }
  @Input()
  public features: LicenseFeatures;
  public get snapshotConfig() {
    return this.features?.snapshotConfig;
  }
  public targetCategories: string[] = [];
  
  private _restrictions: UserSummaryRestrictions;
  @Input()
  public set restrictions(val: UserSummaryRestrictions) {
    this.administrator = val.behavior === AccessLevel.admin;
  }

  constructor() { }

  ngOnInit(): void {
    if(!this.selected) {
      return;
    }
    if(this.features) {
      let config = this.features.snapshotConfig;
      if(!this.features.snapshotConfig) {
        config = {
          low: '@frown',
          medium: '@meh',
          high: '@smile',
          measurements: [{name: '@smile', order: 0}, {name: '@meh', order: 1}, {name: '@frown', order: 2}]
        };
        this.features.snapshotConfig = config;
      } else if(!config.measurements) {
        config.measurements = [{name: config.low ?? '@smile', order: 0}, {name: config.medium ?? '@meh', order: 1}, {name: config.high ?? '@frown', order: 2}];
      }
      this.targetCategories = config.measurements.map(m => m.name);
      const categoryMap = {};
      this.targetCategories.map((cat, i) => {
        categoryMap[cat] = i;
      });

      this.targetCategories.forEach(cat => {
        if(!(this.selected.targetGoals instanceof TargetsClass)) {
          return;
        }
        if(this.selected.targetGoals.frequency && !this.selected.targetGoals.frequency.measurements) {
          this.selected.targetGoals.frequency.measurements = [];
        }
        let frequencyTarget = this.selected.targetGoals.frequency?.measurements?.find(x => x.name == cat);
        if(this.selected.targetGoals.frequency && !frequencyTarget) {
          frequencyTarget = {
            name: cat,
            value: 0,
          };
          this.selected.targetGoals.frequency?.measurements.push(frequencyTarget);
        }
      });
      if(this.selected.targetGoals instanceof TargetsClass && this.selected.targetGoals.frequency) { 
        this.selected.targetGoals.frequency.measurements.sort((a, b) => {
          const ai = categoryMap[a.name];
          const bi = categoryMap[b.name];
          return ai - bi;
        });
      }
    }
    this.frequencyTarget = new TargetProperty(this, 'frequency', false);
    this.durationTarget = new TargetProperty(this, 'duration', true);
  }

  async setLoading(val: boolean) {
    this.loading = val;
  }

  async archive() {
    if(this.selected instanceof StudentTemplateBehaviorClass) {
      return;
    }
    this.setLoading(true);
    try {
      await this.selected.archive(true);
    } finally {
      this.setLoading(false);
    }
  }

  async reactivate() {
    this.setLoading(true);
    if(this.selected instanceof StudentTemplateBehaviorClass) {
      return;
    }
    try {
      await this.selected.archive(false);
    } finally {
      this.setLoading(false);
    }
  }

  async save() {
    this.setLoading(true);
    if(this.selected instanceof StudentTemplateBehaviorClass) {
      return;
    }
    try {
      if(this.features) {
        await this.selected.save();
      }
  
      this.selected = this.selected;
    } catch (err) {
      alert(err.message);
      console.error(err);
    }

    this.setLoading(false);
  }

  cancel() {
    this.selected.cancel();
  }

  getLegendMeasurement(index: number, frequency: boolean) {
    if(frequency) {
      this.selected.targetGoals.setTargets();
      let greaterProgression = this.selected.targetGoals.frequency.target < this.selected.targetGoals.frequency.progress;
      const mes = this.selected.targetGoals.frequency.measurements[index];
      if(!mes) {
        return '';
      }
      if(!greaterProgression) {
        if(mes.value == StudentBehaviorTargetMin) {
          return `less than ${this.selected.targetGoals.frequency.measurements[index - 1].value}`;
        }
        return `${mes.value} or more`;
      } else {
        if(mes.value == 0) {
          return '0';
        }
        if(mes.value == StudentBehaviorTargetMax) {
          return `more than ${this.selected.targetGoals.frequency.measurements[index - 1].value}`;
        }
        return `${mes.value} or less`;
      }
    } else {
      this.selected.targetGoals.setTargets();
      let greaterProgression = this.selected.targetGoals.duration.target < this.selected.targetGoals.duration.progress;
      const mes = this.selected.targetGoals.duration.measurements[index];
      if(!mes) {
        return '';
      }
      if(!greaterProgression) {
        if(mes.value == StudentBehaviorTargetMin) {
          return `less than ${TargetsClass.getDuration(this.selected.targetGoals.duration.measurements[index - 1].value)}`;
        }
        return `${TargetsClass.getDuration(mes.value)} or more`;
      } else {
        if(mes.value == 0) {
          return '0';
        }
        if(mes.value == StudentBehaviorTargetMax) {
          return `more than ${TargetsClass.getDuration(this.selected.targetGoals.duration.measurements[index - 1].value)}`;
        }
        return `${TargetsClass.getDuration(mes.value)} or less`;
      }
    }
  }
}
