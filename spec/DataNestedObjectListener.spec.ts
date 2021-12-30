import { TestApplication } from './TestApplication';
import { DataContext, DataObjectAssociationError, DataConfigurationStrategy } from '../index';
import { resolve } from 'path';
import * as moment from 'moment';

describe('DataNestedObjectListener', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
        return done();
    });
    afterAll((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });
    it('should use zero-or-one multiplicity', async () => {
        await context.executeInTransactionAsync(async () => {
            const configuration = context.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition({
                "name": "ProductDimension",
                "version": "2.0",
                "inherits": "StructuredValue",
                "fields": [
                    {
                        "name": "width",
                        "type": "Number",
                        "nullable": false
                    },
                    {
                        "name": "height",
                        "type": "Number",
                        "nullable": false
                    },
                    {
                        "name": "product",
                        "type": "Product"
                    }
                ],
                "constraints": [
                    {
                        "type": "unique",
                        "fields": [
                            "product"
                        ]
                    }
                ]
            });
            const ProductModel = configuration.getModelDefinition("Product");
            ProductModel.fields.push({
                "name": "productDimensions",
                "type": "ProductDimension",
                "nested": true,
                "expandable": true,
                "multiplicity": "ZeroOrOne",
                "mapping": {
                    "parentModel": "Product",
                    "parentField": "id",
                    "childModel": "ProductDimension",
                    "childField": "product",
                    "associationType": "association",
                    "cascade": "delete"
                }
            });
            configuration.setModelDefinition(ProductModel);
            let product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .silent().getItem();
            Object.assign(product, {
                productDimensions: {
                    height: 0.136,
                    width: 0.069
                }
            });
            await context.model('Product').silent().save(product);
            product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .silent().getItem();
            expect(product.productDimensions).toBeTruthy();
            Object.assign(product, {
                productDimensions: null
            });
            await context.model('Product').silent().save(product);
            let productDimension = await context.model('ProductDimension')
                .where('product/name').equal('Samsung Galaxy S4')
                .silent().getItem();
            expect(productDimension).toBeFalsy();
        });
    });

    it('should use collection of nested objects', async () => {
        await context.executeInTransactionAsync(async () => {
            const configuration = context.getConfiguration().getStrategy(DataConfigurationStrategy);
            configuration.setModelDefinition({
                "name": "SpecialOffer",
                "version": "2.0",
                "inherits": "Offer",
                "fields": [
                    {
                        "@id": "http://schema.org/itemOffered",
                        "name": "itemOffered",
                        "title": "itemOffered",
                        "description": "The item being offered.",
                        "type": "Product",
                        "nullable": false
                    }
                ],
                "constraints": [
                ]
            });
            const ProductModel = configuration.getModelDefinition("Product");
            ProductModel.fields.push({
                "name": "specialOffers",
                "type": "SpecialOffer",
                "nested": true,
                "expandable": true,
                "many": true,
                "mapping": {
                    "parentModel": "Product",
                    "parentField": "id",
                    "childModel": "SpecialOffer",
                    "childField": "itemOffered",
                    "associationType": "association",
                    "cascade": "delete"
                }
            });
            configuration.setModelDefinition(ProductModel);
            let product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .silent().getItem();
            Object.assign(product, {
                specialOffers: [
                    {
                        price: product.price * 0.8,
                        validFrom: new Date(),
                        validThrough: moment().add(1, 'M').toDate()
                    },
                    {
                        price: product.price * 0.6,
                        validFrom: moment().add(2, 'M').toDate(),
                        validThrough: moment().add(3, 'M').toDate()
                    }
                ]
            });
            await context.model('Product').silent().save(product);
            product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .silent().getItem();
            expect(product.specialOffers).toBeInstanceOf(Array);
            expect(product.specialOffers.length).toBe(2);
            Object.assign(product, {
                specialOffers: []
            });
            await context.model('Product').silent().save(product);
            let specialOffers = await context.model('SpecialOffer')
                .where('itemOffered/name').equal('Samsung Galaxy S4')
                .silent().getItems();
            expect(specialOffers.length).toBe(0);
        });
    });
});