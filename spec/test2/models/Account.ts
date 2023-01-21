import { EdmMapping } from '../../../index';
import { Thing } from './Thing';

@EdmMapping.entityType()
class Account extends Thing {

}

export {
    Account
}