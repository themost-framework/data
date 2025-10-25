import {TestUtils} from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { DataContext } from '../types';
import { DataConfigurationStrategy } from '../data-configuration';
import moment  from 'moment';import { DataModel } from '../data-model';
;

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
            context.switchUser();
            
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
            context.switchUser();
            
        });
    });

    it('should use max date validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Offer');
            const field = modelDefinition.fields.find((field: any) => field.name === 'validThrough');
            field.validation = {
                maxValue: moment(new Date()).add(1, 'year').format('YYYY-MM-DD'),
                message: 'Valid through is invalid'
            }
            configuration.setModelDefinition(modelDefinition);
            const Offers = context.model('Offer');
            await expect(Offers.silent().save({
                price: 999,
                validThrough: moment(new Date()).add(1, 'month').toDate(),
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).resolves.toBeTruthy();
            await expect(Offers.silent().save({
                price: 999,
                validThrough: moment(new Date()).add(2, 'year').toDate(),
                itemOffered: {
                    name: 'Lenovo Yoga 2 Pro'
                }
            })).rejects.toThrowError(field.validation.message);
            context.switchUser();
            
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
            context.switchUser();
        });
    });

    it('should use min length validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Product');
            const field = modelDefinition.fields.find((field: any) => field.name === 'model');
            field.validation = {
                minLength: 5,
                message: 'Product model length should be greater or equal to 5.'
            }
            configuration.setModelDefinition(modelDefinition);
            const Products = context.model('Product');
            const item = await Products.find({
                name: 'Lenovo Yoga 2 Pro'
            }).silent().getItem();
            item.model = 'LNYO2PRO';
            await expect(Products.silent().save(item)).resolves.toBeTruthy();
            item.model = 'LNY';
            await expect(Products.silent().save(item)).rejects.toThrowError(field.validation.message);
        });
    });

    it('should use max length validation', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Product');
            const field = modelDefinition.fields.find((field: any) => field.name === 'model');
            field.validation = {
                minLength: 5,
                maxLength: 7,
                message: 'Product model length should be between 5 to 7.'
            }
            configuration.setModelDefinition(modelDefinition);
            const Products = context.model('Product');
            const item = await Products.find({
                name: 'Lenovo Yoga 2 Pro'
            }).silent().getItem();
            item.model = 'LNYO2PR';
            await expect(Products.silent().save(item)).resolves.toBeTruthy();
            item.model = 'LNYO2PRO';
            await expect(Products.silent().save(item)).rejects.toThrowError(field.validation.message);
        });
    });

    it('should use async execute validator', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const configuration = app.getConfiguration().getStrategy(DataConfigurationStrategy);
            const modelDefinition = configuration.getModelDefinition('Product');
            const field = modelDefinition.fields.find((field: any) => field.name === 'model');
            field.validation = {
                validator: async function(event: {
                    model: DataModel,
                    target: any,
                    value: any
                }) {
                    return /^[A-Z0-9]+$/.test(event.value);
                },
                message: 'Product model accepts only upper case letters and numbers.'
            }
            configuration.setModelDefinition(modelDefinition);
            const Products = context.model('Product');
            const item = await Products.find({
                name: 'Lenovo Yoga 2 Pro'
            }).silent().getItem();
            item.model = 'LNYO2PR';
            await expect(Products.silent().save(item)).resolves.toBeTruthy();
            item.model = 'LNYO2PrO';
            await expect(Products.silent().save(item)).rejects.toThrowError(field.validation.message);
        });
    });
    
});