import { ApiClientService } from "../../services";
import { 
    LicenseDetails, ManageTemplates, ManageAbcClass, 
    ManageStudentsClass, ManageAppsClass 
} from "..";

export class ManageClass {
    private _students: ManageStudentsClass;
    private _apps: ManageAppsClass;
    private _licenseDetails: LicenseDetails;
    private _abc: ManageAbcClass;
    private _templates: ManageTemplates;

    get license(): Promise<LicenseDetails> {
        return this.getLicense();
    }

    constructor(private api: ApiClientService, private _license: string) {}

    async getLicense() {
        if(this._licenseDetails) {
            return this._licenseDetails;
        } else {
            this._licenseDetails = await this.api.getLicense(this._license);
        }
        return this._licenseDetails;
    }

    async getAbc() {
        if(!this._abc) {
            const license = await this.license;
            this._abc = new ManageAbcClass(license, this.api);
        }
        return this._abc;
    }

    async getStudents() {
        if(!this._students) {
            this._students = new ManageStudentsClass(this._license, this.api);
            await this._students.load();
        }
        return this._students;
    }

    async getApps() {
        if(!this._apps) {
            this._apps = new ManageAppsClass(this._license, this.api, this);
            await this._apps.load();
        }
        return this._apps;
    }

    async getStats() {
        return (await this.api.getLicenseStats(this._license)).stats;
    }

    async getTemplates() {
        if(!this._templates) {
            this._templates = new ManageTemplates(await this.license, this.api);
        }
        return this._templates;
    }

    async putDisplayTags(tags: string[]) {
        await this.api.putLicenseDisplayTags({ 
            license: this._license, 
            displayTags: tags.map((t, i) => ({ order: i, tagName: t }))
        });
    }
}