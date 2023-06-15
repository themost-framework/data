import { TestApplication } from './TestApplication';
import { DataContext } from '../index';
import { resolve } from 'path';
const moment = require('moment');

describe('DataNestedObjectListener', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        app.getConfiguration().setSourceAt('adapters', [
            {
                name: 'test-local',
                invariantName: 'test',
                default: true,
                options: {
                    database: resolve(__dirname, 'test2/db/local.db')
                }
            }
        ])
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalize();
        await app.finalize();
    });
    it('should use zero-or-one multiplicity', async () => {
        await context.executeInTransactionAsync(async () => {
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

    it('should filter zero-or-one multiplicity', async () => {
        await context.executeInTransactionAsync(async () => {
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
            const q = await context.model('Product')
                .filterAsync({
                    '$filter': `name eq 'Samsung Galaxy S4'`,
                    '$select': 'id,productDimensions'
                });
            product = await q.getItem();
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

    it('should expand zero-or-one multiplicity', async () => {
        await context.executeInTransactionAsync(async () => {
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
            const q = await context.model('Product')
                .filterAsync({
                    '$filter': `name eq 'Samsung Galaxy S4'`,
                    '$select': 'id,productDimensions',
                    '$expand': 'productDimensions'
                });
            product = await q.getItem();
            expect(product.productDimensions).toBeInstanceOf(Object);
        });
    });

    it('should expand zero-or-one multiplicity with closure', async () => {
        await context.executeInTransactionAsync(async () => {
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
            const value = product.productDimensions.id;
            product = await context.model('Product')
                .where((x: { name: string }) => x.name === 'Samsung Galaxy S4')
                .select(({ id, productDimensions }: any) => {
                    return {
                        id,
                        productDimensions
                    }
                }).getItem();
            expect(product.productDimensions).toEqual(value);
            product = await context.model('Product')
                .where((x: { name: string }) => x.name === 'Samsung Galaxy S4')
                .select(({ id, productDimensions }: any) => {
                    return {
                        id,
                        productDimensions
                    }
                }).expand((x: any) => x.productDimensions)
                .getItem();
            expect(product.productDimensions).toBeInstanceOf(Object);
            expect(product.productDimensions.id).toEqual(value);
        });
    });

    it('should use collection of nested objects', async () => {
        await context.executeInTransactionAsync(async () => {
            
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
            // LD1179
            let updateProduct = {
                model: product.model,
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
            }
            await context.model('Product').silent().save(updateProduct);
            product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4')
                .silent().getItem();
            expect(product.specialOffers).toBeInstanceOf(Array);
            expect(product.specialOffers.length).toBe(2);
            updateProduct = {
                model: product.model,
                specialOffers: [
                ]
            };
            await context.model('Product').silent().save(updateProduct);
            specialOffers = await context.model('SpecialOffer')
                .where('itemOffered/name').equal('Samsung Galaxy S4')
                .silent().getItems();
            expect(specialOffers.length).toBe(0);
        });
    });
});
