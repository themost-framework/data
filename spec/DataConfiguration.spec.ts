import {DataApplication} from '../data-application';
import {resolve} from 'path';
import {DataConfigurationStrategy} from '../data-configuration';

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

});
