import { copy, TargetsClass } from "../..";
import { SnapshotConfig, StudentTemplateBehavior } from '@mytaptrack/types';

export class StudentTemplateBehaviorClass implements StudentTemplateBehavior {
    get id() { return this.name; }
    name: string;
    desc: string;
    isDuration?: boolean;
    daytime?: boolean;
    baseline?: boolean;
    targetGoals?: TargetsClass;

    constructor(private data: StudentTemplateBehavior, private snapshotConfig: SnapshotConfig, private remove: (item: StudentTemplateBehaviorClass) => void) {
        this.cancel();
    }

    save() {}

    archive(val: boolean) {}

    cancel() {
        this.name = this.data.name;
        this.desc = this.data.desc;
        this.isDuration = this.data.isDuration;
        this.daytime = this.data.daytime;
        this.baseline = this.data.baseline;
        this.targetGoals = new TargetsClass(this.data.targets? copy(this.data.targets) : [], this.snapshotConfig);
    }

    delete() {
        this.remove(this);
    }

    toStudentTemplateBehavior(): StudentTemplateBehavior {
        return {
            name: this.name,
            desc: this.desc,
            isDuration: this.isDuration,
            daytime: this.daytime,
            baseline: this.baseline,
            targets: this.targetGoals.dataModel
        };
    }
}
