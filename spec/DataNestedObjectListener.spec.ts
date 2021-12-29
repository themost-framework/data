import { TestApplication } from './TestApplication';
import { DataContext, DataObjectAssociationError, DataConfigurationStrategy } from '../index';
import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';

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
    it('should insert nested object', async () => {
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
});