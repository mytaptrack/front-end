import { MeasurementType, SnapshotConfig, StudentBehaviorTargetMax, StudentBehaviorTargetMin } from "@mytaptrack/types";

export interface TargetItemValues {
    target: number; 
    progress?: number; 
    measurement: MeasurementType;
    measurements: {
        name: string;
        value: number;
    }[];
}
interface TargetsItem extends TargetItemValues {
    targetType: string;
}

export class TargetsClass {
    static getDuration(stat: number) {
        const absState = Math.abs(stat);
        const seconds = Math.floor(absState % 60);
        const minutes = Math.floor(absState/60) % 60;
        const hour = Math.floor(absState / 3600);

        if(hour == 0) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${hour}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    setTargets() {
        this.data.forEach(d => {
            if(d.measurements.length <= 1 || d.measurements.find((x, i) => x.value == undefined && i != d.measurements.length - 1)) {
                return;
            }

            d.measurements.forEach(m => {
                if(typeof(m.value) == 'string') {
                    m.value = Number.parseInt(m.value);
                }
            });

            if(d.target != d.measurements[0].value) {
                d.target = d.measurements[0].value;
            }
            if(d.progress != d.measurements[1].value) {
                d.progress = d.measurements[1].value;
            }
            if(d.target < d.progress && d.measurements[d.measurements.length - 1].value != StudentBehaviorTargetMax) {
                d.measurements[d.measurements.length - 1].value = StudentBehaviorTargetMax;
            } else if(d.target > d.progress && d.measurements[d.measurements.length - 1].value != StudentBehaviorTargetMin) {
                d.measurements[d.measurements.length - 1].value = StudentBehaviorTargetMin;
            }
        });
    }
    
    get frequency(): TargetItemValues {
        const retval = this.data.find(x => x.targetType === 'frequency');
        return retval;
    }
    set frequency(value: TargetItemValues) {
        const index = this.data.findIndex(x => x.targetType === 'frequency');
        if(!value) {
            if(index > -1) {
                this.data.splice(index, 1);
            }
        } else {
            const indexable: TargetsItem = {
                ...value,
                targetType: 'frequency'
            };
            if(index > -1) {
                this.data[index] = indexable;
            } else {
                this.data.push(indexable);
            }
        }
    }
    get duration(): TargetItemValues {
        let retval = this.data.find(x => x.targetType === 'duration');
        return retval;
    }
    set duration(value: TargetItemValues) {
        const index = this.data.findIndex(x => x.targetType === 'duration');
        if(!value) {
            if(index > -1) {
                this.data.splice(index, 1);
            }
        } else {
            const indexable: TargetsItem = {
                ...value,
                targetType: 'duration'
            };
            if(index > -1) {
                this.data[index] = indexable;
            } else {
                this.data.push(indexable);
            }
        }
    }
    get dataModel(): TargetsItem[] {
        return this.data;
    }
    constructor(private data: TargetsItem[], private snapshotConfig: SnapshotConfig) {
        data.forEach(d => {
            if(d.measurements) {
                return;
            }

            d.measurements = snapshotConfig?.measurements?.map((m, i) => {
                return {
                    name: m.name,
                    value: i == 0 ? d.target : i == 1 ? d.progress : undefined
                };
            });
        });
    }

    addTarget(type: 'frequency' | 'duration') {
        const val = {
            targetType: type,
            target: 0,
            progress: 0,
            measurement: type == 'frequency'? MeasurementType.event : MeasurementType.sum,
            measurements: this.snapshotConfig.measurements.map(m => ({
                name: m.name,
                value: undefined,
            }))
        };
        this.data.push(val);
    }
}