import { StudentClass, moment } from "..";
import { ApiClientService } from "../../../services";
import { Milestone } from "@mytaptrack/types";

export class MilestoneClass {
    date: string;
    title: string;
    description: string;

    get dateString() {
        return moment(this.date).format('MM/DD/YYYY');
    }
    get isNew(): boolean {
        return !this._student.milestones.includes(this);
    }

    get milestone(): Milestone {
        return {
            date: moment(this.date).format('yyyy-MM-DD'),
            title: this.title,
            description: this.description
        };
    }

    constructor(private _data: Milestone, private _student: StudentClass, private _api: ApiClientService) {
        this.date = _data.date;
        this.title = _data.title;
        this.description = _data.description;
    }

    async save() {
        if(this.isNew) {
            this._student.milestones.push(this);
        }
        await this._student.save();
        this._data = this.milestone;
    }

    cancel() {
        this.date = this._data.date;
        this.title = this._data.title;
        this.description = this._data.description;
    }

    async remove() {
        if(this.isNew) {
            return;
        }
        const index = this._student.milestones.indexOf(this);
        this._student.milestones.splice(index, 1);
        await this._student.save();
    }
}