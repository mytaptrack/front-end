import { AbcCollectionClass } from "..";
import { ApiClientService } from "../../../services";
import { LicenseDetails } from '@mytaptrack/types';

export class ManageAbcClass {
    collections: AbcCollectionClass[];

    constructor(private licenseDetails: LicenseDetails, private api: ApiClientService) {
        this.collections = licenseDetails.abcCollections.map(x => 
            new AbcCollectionClass(x, async () => { this.save(); }, async (item: AbcCollectionClass) => { this.delete(item); }));
    }

    async save() {
        this.api.putAbcCollections(this.collections.map(x => x.toAbcCollection()));
    }

    async delete(item: AbcCollectionClass) {
        const index = this.collections.findIndex(x => x === item);
        if(index >= 0) {
            this.collections.splice(index, 1);
            await this.save();
        }
    }

    createCollection() {
        const retval = new AbcCollectionClass({
            name: 'ABC Settings',
            tags: [],
            antecedents: [],
            consequences: []
          }, async () => { this.save(); }, async (item) => { this.delete(item); });
        this.collections.push(retval);
        return retval;
    }
}