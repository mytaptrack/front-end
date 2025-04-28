import { TrackTemplateBehavior, AppTemplate, StudentTemplate } from "../..";

export class AppTemplateCollection {
    private _items: AppTemplate[] = [];
    public get items() { return this._items; }
    public get apps() {
        return this._items;
    }
    get length() { return this._items.length; }

    get appTemplates() { return this._items.map(x => x.appTemplate)}

    constructor(private student: StudentTemplate) {
        this._items = this.student.appTemplates.map(x => new AppTemplate(student, x, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); }));
    }

    private async onAddDevice(item: AppTemplate) {
        if(!this._items.find(x => x == item)) {
            this._items.push(item);
        }
    }
    private async onRemoveDevice(item: AppTemplate) {
        const index = this._items.findIndex(x => x == item);
        if(index >= 0) {
            this._items.splice(index, 1);
        }
    }
    find(predicate: (val: AppTemplate) => boolean) {
        return this._items.find(predicate);
    }
    map(callbackfn: (value: AppTemplate, index: number, array: AppTemplate[]) => unknown) {
        return this._items.map(callbackfn);
    }
    filter(predicate: (value: AppTemplate, index: number, array: AppTemplate[]) => boolean) {
        return this._items.filter(predicate);
    }
    async load() {
    }

    public addTrack2(): any {
    }

    public async addApp(deviceName: string): Promise<AppTemplate> {
        const retval = new AppTemplate(this.student, {
            name: deviceName,
            desc: '',
            parentTemplate: this.student.name,
            tags: [],
            events: [],
        }, (val) => { this.onAddDevice(val); }, (val) => { this.onRemoveDevice(val); });
        this._items.push(retval);
        return retval;
    }
}
