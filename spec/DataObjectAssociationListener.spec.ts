import { TestApplication } from './TestApplication';
import { DataContext, DataObjectAssociationError } from '../index';
import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';
import { ConfigurationBase } from '@themost/common';

describe('DataObjectAssociationListener', () => {
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
    it('should validate foreign-key association', async ()=> {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product');
            const product = await Products
                .where('name').equal('Samsung Galaxy S4')
                .getItem();
            let newOffer: any = {
                itemOffered: product.id,
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer))
                .toBeResolved();
            
        });
    });
    it('should validate association', async ()=> {
        Object.assign(context, {
           user: {
               name: 'alexis.rees@example.com'
           } 
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newOffer: any = {
                itemOffered: {
                    name: 'Samsung Galaxy S4'
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31'),
                seller: -1
            }
            await expectAsync(context.model('Offer').save(newOffer))
                .toBeRejectedWithError(new DataObjectAssociationError().message);
            newOffer = {
                    itemOffered: {
                        name: 'Samsung Galaxy S4'
                    },
                    price: 999,
                    validFrom: new Date('2021-12-20'),
                    validThrough: new Date('2021-12-31'),
                    seller: {
                        email: 'caitlyn.barber@example.com'
                    }
                }
                await expectAsync(context.model('Offer').save(newOffer))
                .toBeResolved();
            const item = await context.model('Offer')
                .where('id').equal(newOffer.id).expand('itemOffered', 'seller').getItem();
            expect(item).toBeTruthy();
            expect(item.itemOffered).toBeTruthy();
            expect(item.seller).toBeTruthy();

            newOffer = {
                itemOffered: {
                    name: 'Samsung Galaxy S4'
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31'),
                seller: null
            }
            await expectAsync(context.model('Offer').save(newOffer))
            .toBeResolved();
        });
    });
    it('should validate null association', async ()=> {
        Object.assign(context, {
            user: {
                name: 'alexis.rees@example.com'
            }
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newOffer: any = {
                itemOffered: {
                    id: null
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').save(newOffer))
                .toBeRejectedWithError('A value is required.');
            newOffer = {
                itemOffered: {
                    model: null
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').save(newOffer))
                .toBeRejectedWithError(new DataObjectAssociationError().message);
        });
    });
    it('should use silent mode', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             let newOffer: any = {
                itemOffered: {
                    name: 'Samsung Galaxy S4'
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31'),
                seller: -1
            }
            await expectAsync(context.model('Offer').silent().save(newOffer))
                .toBeRejectedWithError(new DataObjectAssociationError().message);
                newOffer = {
                    itemOffered: {
                        name: 'Samsung Galaxy S4'
                    },
                    price: 999,
                    validFrom: new Date('2021-12-20'),
                    validThrough: new Date('2021-12-31'),
                    seller: {
                        email: 'caitlyn.barber@example.com'
                    }
                }
                await expectAsync(context.model('Offer').silent().save(newOffer))
                .toBeResolved();
        });
    });
    it('should use tags', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             const Products = context.model('Product');
            let product = await Products.where('name').equal('Nintendo 2DS').getItem();
            expect(product).toBeTruthy();
            Object.assign(product, {
                keywords: [
                    "Online",
                    "Games",
                    "Console"
                ]
            });
            await expectAsync(Products.save(product)).toBeRejected();
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
             });
             await expectAsync(Products.save(product)).toBeResolved();
             product = await Products.where('name').equal('Nintendo 2DS')
                .expand('keywords')
                .getItem();
            expect(product).toBeTruthy();
            expect(product.keywords.length).toBe(3);
            product.keywords.splice(0, 1);
            await Products.save(product);
            product = await Products.where('name').equal('Nintendo 2DS')
                .expand('keywords')
                .getItem();
            expect(product).toBeTruthy();
            expect(product.keywords.length).toBe(2);

            product = await Products.where('model').equal('ZE2956')
                .getItem();
            Object.assign(product, {
                keywords: [
                    "Monitor",
                    "Games"
                ]
            });
            await Products.save(product);
            const products = await Products.where('keywords/value')
                .equal('Games').getItems();
            expect(products.length).toBe(2);
        });
    });

    it('should validate associated object given as value', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             // get object
             const product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let newOffer: any = {
                itemOffered: product.id,
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer)).toBeResolved();
            let offer = await context.model('Offer')
                .where('id').equal(newOffer.id).silent().getItem();
            expect(offer).toBeTruthy();
            expect(offer.itemOffered).toBe(product.id);

            newOffer = {
                itemOffered: Number(product.id),
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer)).toBeResolved();
            offer = await context.model('Offer')
                .where('id').equal(newOffer.id).silent().getItem();
            expect(offer).toBeTruthy();
            expect(offer.itemOffered).toBe(product.id);
        });
    });

    it('should validate associated object given as plain object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             // get object
             const product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let newOffer: any = {
                itemOffered: {
                    id: product.id
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer)).toBeResolved();
            let offer = await context.model('Offer')
                .where('id').equal(newOffer.id).silent().getItem();
            expect(offer).toBeTruthy();
            expect(offer.itemOffered).toBe(product.id);
        });
    });

    it('should validate associated object without having primary key', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             // get object
             const product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let newOffer: any = {
                itemOffered: {
                    name: product.name
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer)).toBeResolved();
            let offer = await context.model('Offer')
                .where('id').equal(newOffer.id).silent().getItem();
            expect(offer).toBeTruthy();
            expect(offer.itemOffered).toBe(product.id);
        });
    });

    it('should validate associated object given as data object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: null
             });
             // get object
             const product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').getTypedItem();
            expect(product).toBeTruthy();
            let newOffer: any = {
                itemOffered: product,
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31')
            }
            await expectAsync(context.model('Offer').silent().save(newOffer)).toBeResolved();
            let offer = await context.model('Offer')
                .where('id').equal(newOffer.id).silent().getItem();
            expect(offer).toBeTruthy();
            expect(offer.itemOffered).toBe(product.id);
        });
    });

});
