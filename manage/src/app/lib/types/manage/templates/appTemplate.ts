import * as _ from "lodash";
import { 
    StudentTemplateBehaviorClass, copy, StudentTemplate
} from "../..";
import {
    LicenseAppTemplate, TrackTemplateBehavior
} from '@mytaptrack/types';

export class AppTemplateBehavior {
    get name() { return this.behavior.name; }
    order: number;
    track: boolean;
    abc: boolean;

    get appEvent(): TrackTemplateBehavior {
        return {
            name: this.behavior.name,
            desc: undefined,
            order: this.order,
            track: this.track,
            abc: this.abc
        };
    }

    get isUsed() { return this.track; }

    constructor(private event: TrackTemplateBehavior, private behavior: StudentTemplateBehaviorClass) {
        if(event) {
            this.order = event.order;
            this.track = event.track;
            this.abc = event.abc;
        }
    }
}

function containsAllNames(names: string[], behaviors: StudentTemplateBehaviorClass[]) {
    if(names.length != behaviors.length) {
        return false;
    }
    const retval = _.every(names, (name) => {
        return _.find(behaviors, (behavior) => {
            return behavior.name === name;
        });
    });

    return retval;
}

export class AppTemplate {
    private _name: string;
    get name() { return this._name; }
    set name(value: string) {
        this._name = value;
        if(!value) {
            this.tags = [];
        } else {
            this.tags = [this.student.tag, 'Role:' + value];
        }
    }
    desc: string;
    events: TrackTemplateBehavior[];
    tags: string[];
    parentTemplate: string;
    get isApp() { return true; }
    get isNew() { return false; }
    get deviceName() { return this.name; }
    get tag() { return this.tags[0];}

    private _studentBehaviors: string[] = [];
    private _studentResponses: string[] = [];
    private _behaviors: AppTemplateBehavior[]  = [];
    get behaviors() {
        if(!containsAllNames(this._studentBehaviors, this.student.trackables.behaviors) ||
            !containsAllNames(this._studentResponses, this.student.trackables.responses)) {
            this._studentBehaviors = this.student.trackables.behaviors.map(x => x.name);
            this._studentResponses = this.student.trackables.responses.map(x => x.name);
            this.loadBehaviors();
        }
        return this._behaviors;
    }

    get appTemplate() {
        return {
            name: this.name,
            desc: this.desc,
            events: this.behaviors.filter(x => x.isUsed).map(x => x.appEvent),
            tags: this.tags,
            parentTemplate: this.parentTemplate
        };
    }

    constructor(private student: StudentTemplate, private template: LicenseAppTemplate, private addTemplate: (template: AppTemplate) => void, private removeTemplate: (template: AppTemplate) => void) {
        this.tags = copy(template.tags) ?? [];
        this.name = template.name;
        this.desc = template.desc;
        this.events = copy(template.events) ?? [];
        this.parentTemplate = template.parentTemplate;
    }

    private loadBehaviors() {
        if(this._behaviors) {
            this.events = this._behaviors.map(x => x.appEvent);
        }
        const behaviors = this.student.trackables.activeBehaviors;
        this._behaviors = [].concat(
            behaviors.map(x => {
                const event = this.events.find(y => y.name == x.name);
                return new AppTemplateBehavior(event, x);
            }),
            this.student.trackables.activeResponses.map(x => {
                const event = this.events.find(y => y.name == x.name);
                return new AppTemplateBehavior(event, x);
            })
        );
        return this._behaviors;
    }

    async save() {
    }
    async cancel() {

    }
}