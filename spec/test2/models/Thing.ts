import {DataObject} from '../../../data-object';
import {EdmMapping} from '../../../odata';

@EdmMapping.entityType('Thing')
class Thing extends  DataObject {

    id?: any;
    sameAs?: any;
    name?: string;
    description?: string;
    url?: string;
    image?: string;
    additionalType?: string;
    identifier?: string;
    disambiguatingDescription?: string;
    alternateName?: string;
    dateCreated?: Date;
    dateModified?: Date;
    createdBy?: any;
    modifiedBy?: any;

    constructor() {
        super();
    }

}

export {
    Thing
}