import { ApiClientService } from "../../services";
import { StudentDocument, StudentClass, moment } from "..";

export class MttDocument implements StudentDocument {
    id: string;
    name: string;
    timerange: { start: number; stop: number; };
    size: number;
    uploadDate: number;
    complete: boolean;
    downloading: boolean;
    deleting: boolean;

    private _link: string;
    get link() { return this._link; }

    get start() {
        return moment(this.timerange.start).format('MM/DD/yyyy');
    }
    get lastUpdated() {
        return moment(this.uploadDate).format('MM/DD/yyyy');
    }

    constructor(private document: StudentDocument, private studentId: string, private api: ApiClientService, private onDelete: (val: MttDocument) => void) {
        Object.keys(this.document).forEach(key => { this[key] = document[key] });
        this.getDownloadUrl().then(url => this._link = url);
    }

    async getDownloadUrl() {
        return await this.api.getDocumentUrl(this.studentId, this.id);
    }
    async setDownloading(val: boolean) {
        this.downloading = val;
    }
    async download() {
        this.setDownloading(true);
        try {
            let url = await this.getDownloadUrl();
            window.location.href = url;
        } finally {
            this.setDownloading(false);
        }
    }
    async setDeleting(val: boolean) {
        this.deleting = val;
    }
    async delete() {
        try {
            this.setDeleting(true);
            await this.api.deleteDocument(this.studentId, this.id);
            this.onDelete(this);
        } finally {
            this.setDeleting(false);
        }
    }
}

export class MttDocuments {
    private _documents: MttDocument[];
    get documents() {
        return this._documents;
    }
    constructor(private student: StudentClass, private api: ApiClientService) {
    }

    private sort() {
        this._documents.sort((a, b) => {
            let retval = b.timerange.start - a.timerange.start;
            if(retval == 0) {
                retval = b.timerange.stop - a.timerange.stop;
            }
            return retval;
        });
    }
    onDelete(val: MttDocument) {
        const index = this._documents.findIndex(x => x.id == val.id);
        if(index > -1) {
            this._documents.splice(index, 1);
        }
    }
    async load() {
        const documents = await this.api.getDocuments(this.student.studentId);
        this._documents = documents?.map(x => new MttDocument(x, this.student.studentId, this.api, (val) => { this.onDelete(val); })) ?? [];
        this.sort();
    }

    async upload(filename: string, start: string, end: string, importContent: any) {
        const params = {
            studentId: this.student.studentId,
            name: filename,
            timerange: {
                start,
                end
            },
            complete: false,
            size: importContent.size
        };
        const uploadUrl = await this.api.putDocument(params) as string;

        const httpResult = await this.api.http.put(uploadUrl, importContent).toPromise();

        params.complete = true;
        const result = await this.api.putDocument(params) as StudentDocument;
        if(result && !this._documents.find(x => x.id == result.id)) {
            this._documents.push(new MttDocument(result, this.student.studentId, this.api, (val) => { this.onDelete(val); }));
            this.sort();
        }
    }
}