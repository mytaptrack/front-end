import { ApiClientService } from "../../../services";
import { StudentClass } from "..";

export class ManageStudentsClass {
    students: StudentClass[];
    
    constructor(private license: string, private api: ApiClientService) {

    }

    async load() {
        const result = await this.api.getManagedStudents(this.license);
        this.students = result.students.map(x => new StudentClass(x, this.api, undefined));
    }
}