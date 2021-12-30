import { DataObject } from '../../../data-object';
import { EdmMapping } from '../../../index';
import { Printer } from './Printer';

@EdmMapping.entityType('LaserPrinter')
export class LaserPrinter extends Printer {
    
}