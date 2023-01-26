import {TestUtils} from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import { DataConfigurationStrategy } from '../data-configuration';
describe('DataValidator', () => {

    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });


    it('should use pattern validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            context.user = {
                name: 'alexis.rees@example.com'
            }
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Party');
            const field = modelDefinition.fields.find((field: any) => field.name === 'faxNumber');
            field.validation = {
                pattern: '^\\+\\d+$',
                patternMessage: 'Fax number should with "+" e.g. +301234567890'
            }
            configuration.setModelDefinition(modelDefinition);
            const People = context.model('Person');
            const item = await People.asQueryable().where((x: any) => {
                return x.email === 'aaron.matthews@example.com';
            }).getItem();
            expect(item).toBeTruthy();
            item.faxNumber = '+301234567890';
            await expect(People.save(item)).resolves.toBeTruthy();
            item.faxNumber = '301234567890';
            await expect(People.save(item)).rejects.toThrowError('Validate');
            delete context.user;
            
        });
    });
    
});