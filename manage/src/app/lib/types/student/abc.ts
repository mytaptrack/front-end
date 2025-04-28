import { ApiClientService } from "../../../services";
import { StudentClass } from "..";
import { AbcCollection } from '@mytaptrack/types';
import * as _ from 'lodash';

export class AbcCollectionClass implements AbcCollection {
    private _student: StudentClass;
    private _api: ApiClientService;
    private _save: () => Promise<void>;
    private _delete: (item: AbcCollectionClass) => Promise<void>;
    private data: AbcCollection;
    name: string;
    tags: string[];
    antecedents: string[];
    consequences: string[];
    overwrite?: boolean;
    get originalName() { return this.data?.name || this.name; }

    constructor(data: AbcCollection, saveData: () => Promise<void>, deleteData: (item: AbcCollectionClass) => Promise<void>);
    constructor(data: AbcCollection, student: StudentClass, api: ApiClientService);
    constructor(...args: any[]) {
        if(args[0]) {
            this.data = args[0];
            _.merge(this, args[0]);
        }
        if(args[1] instanceof StudentClass) {
            this._student = args[1];
            this._api = args[2];
        } else {
            this._save = args[1];
            this._delete = args[2];
        }
    }

    toAbcCollection(): AbcCollection {
        return {
            name: this.name,
            tags: this.tags,
            antecedents: this.antecedents,
            consequences: this.consequences,
            overwrite: this.overwrite
        };
    }

    async save() {
        const abc = this.toAbcCollection();
        if(this._student) {
            await this._api.putStudentAbcV2(this._student.studentId, abc);
        } else {
            await this._save();
        }
        this.data = abc;
    }

    cancel() {
        if(this.data && Object.keys(this.data).length > 0) {
            _.merge(this, this.data);
        } else {
            this.name = '';
            this.tags = [];
            this.antecedents = [];
            this.consequences = [];
            delete this.overwrite;
        }
    }

    async delete() {
        if(this._student) {
            await this._api.deleteStudentAbcV2(this._student.studentId);
            this.name = '';
            this.antecedents = [];
            this.consequences = [];
            this.tags = [];
        } else {
            await this._delete(this);
        }
    }
}