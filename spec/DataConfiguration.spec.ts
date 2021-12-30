import {DataApplication} from '../data-application';
import {resolve} from 'path';
import {DataConfigurationStrategy} from '../data-configuration';
import ComputerPeripheral from './test1/models/ComputerPeripheral';
import Laptop from './test1/models/laptop-model';
import ComputerMonitor from './test1/models/computer-monitor.model';
import {Printer} from './test1/models/Printer';
import {LaserPrinter} from './test1/models/laser-printer.model';

describe('DataConfiguration', () => {
    let cwd = resolve(__dirname, 'test1');
    it('should get data model definition', () => {
        const app = new DataApplication(cwd);
        const configuration = app.configuration.getStrategy(DataConfigurationStrategy);
        expect(configuration).toBeTruthy();
        const modelDefinition = configuration.getModelDefinition('Account');
        expect(modelDefinition).toBeTruthy();
    });

    it('should get data model class', async () => {

        const app = new DataApplication(cwd);
        const configuration = app.configuration.getStrategy(DataConfigurationStrategy);
        let modelDefinition = configuration.getModelDefinition('Account');
        modelDefinition.classPath = './models/Account#Account';
        const context = app.createContext();
        let AccountClass = context.model('Account').getDataObjectType();
        let module = require(resolve(__dirname, 'test1/models/Account'));
        expect(AccountClass).toBeTruthy();
        expect(AccountClass).toBe(module.Account);

        modelDefinition = configuration.getModelDefinition('Account');
        delete modelDefinition.classPath;
        delete modelDefinition.DataObjectClass;
        configuration.setModelDefinition(modelDefinition);
        await context.finalizeAsync();

        modelDefinition = configuration.getModelDefinition('Account');
        modelDefinition.classPath = './models/Account#MissingMember';
        delete modelDefinition.DataObjectClass;
        configuration.setModelDefinition(modelDefinition);
        expect(() => {
            const AccountClass = context.model('Account').getDataObjectType();
        }).toThrowError('Module exported member not found');

    });

    it('should get data model class by name', async () => {
        const app = new DataApplication(cwd);
        const context = app.createContext();
        const configuration = app.configuration.getStrategy(DataConfigurationStrategy);
        const modelDefinition = configuration.getModelDefinition('Account');
        delete modelDefinition.classPath;
        let AccountClass = context.model('Account').getDataObjectType();
        let module = require(resolve(__dirname, 'test1/models/Account'));
        expect(AccountClass).toBeTruthy();
        expect(AccountClass).toBe(module.Account);
        await context.finalizeAsync();
    });

    it('should get data model class exported as default member', async () => {
        const app = new DataApplication(cwd);
        const context = app.createContext();
        const configuration = app.configuration.getStrategy(DataConfigurationStrategy);
        configuration.setModelDefinition({
            "name": "ComputerPeripheral",
            "version": "2.0",
            "inherits": "Product",
            "fields": [
            ]
        });
        const ComputerPeripheralClass = context.model('ComputerPeripheral').getDataObjectType();
        expect(ComputerPeripheral).toBe(ComputerPeripheralClass);
        
        configuration.setModelDefinition({
            "name": "Laptop",
            "version": "2.0",
            "inherits": "Product",
            "fields": [
            ]
        });
        const LaptopClass = context.model('Laptop').getDataObjectType();
        expect(LaptopClass).toBe(Laptop);

        configuration.setModelDefinition({
            "name": "ComputerMonitor",
            "version": "2.0",
            "inherits": "Product",
            "fields": [
            ]
        });
        const ComputerMonitorClass = context.model('ComputerMonitor').getDataObjectType();
        expect(ComputerMonitorClass).toBe(ComputerMonitor);
        await context.finalizeAsync();
    });
    it('should get data model class exported as member', async () => {
        const app = new DataApplication(cwd);
        const context = app.createContext();
        const configuration = app.configuration.getStrategy(DataConfigurationStrategy);
        configuration.setModelDefinition({
            "name": "Printer",
            "version": "2.0",
            "inherits": "Product",
            "fields": [
            ]
        });
        const PrinterClass = context.model('Printer').getDataObjectType();
        expect(PrinterClass).toBe(Printer);

        configuration.setModelDefinition({
            "name": "LaserPrinter",
            "version": "2.0",
            "inherits": "Printer",
            "fields": [
            ]
        });
        const LaserPrinterClass = context.model('LaserPrinter').getDataObjectType();
        expect(LaserPrinterClass).toBe(LaserPrinter);

        configuration.setModelDefinition({
            "name": "InkjetPrinter",
            "version": "2.0",
            "inherits": "Printer",
            "fields": [
            ]
        });
        const InkjetPrinterClass = context.model('InkjetPrinter').getDataObjectType();
        expect(InkjetPrinterClass).toBe(Printer);

        await context.finalizeAsync();
    });

});
