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
            await expect(People.save(item)).rejects.toThrowError('Fax number should with "+" e.g. +301234567890');
            delete context.user;
            
        });
    });

    it('should use min validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Offer');
            const field = modelDefinition.fields.find((field: any) => field.name === 'price');
            field.validation = {
                minValue: 0,
                message: 'Price should be greater or equal to zero.'
            }
            configuration.setModelDefinition(modelDefinition);
            const Offers = context.model('Offer');
            await expect(Offers.silent().save({
                price: 999,
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).resolves.toBeTruthy();
            await expect(Offers.silent().save({
                price: -1,
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).rejects.toThrowError(field.validation.message);
            delete context.user;
            
        });
    });

    it('should use max validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Offer');
            const field = modelDefinition.fields.find((field: any) => field.name === 'price');
            field.validation = {
                maxValue: 1000,
                message: 'Price should be lower or equal to 1000.'
            }
            configuration.setModelDefinition(modelDefinition);
            const Offers = context.model('Offer');
            await expect(Offers.silent().save({
                price: 999,
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).resolves.toBeTruthy();
            await expect(Offers.silent().save({
                price: 1001,
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).rejects.toThrowError(field.validation.message);
            delete context.user;
            
        });
    });
    
});