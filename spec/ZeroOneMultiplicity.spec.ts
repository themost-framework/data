import { resolve } from 'path';
import { DataContext, DataModel, FunctionContext } from '../index';
import { TestApplication2 } from './TestApplication';
import {TestUtils} from "./adapter/TestUtils";
import {promisify} from 'util';

declare interface DataContextWithCulture extends DataContext {
    culture(value?: string): string;
}

Object.assign(DataContext.prototype, {
    culture(value: string) {
        if (typeof value === 'undefined') {
            return this._culture || 'en';
        }
        this._culture = value;
        return this._culture;
    }
})

describe('ZeroOrOneMultiplicity', () => {
    let app: TestApplication2;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    })
    it('should use zero or one multiplicity', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country').where('cioc').equal('CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').expand('madeIn').getItem();
            expect(product.madeIn).toBeTruthy();
            expect(product.madeIn.id).toEqual(country.id);
            country = await context.model('Country').where('cioc').equal('GER').getItem();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            product = await context.model('Product')
                .where('name').equal('Samsung Galaxy S4').expand('madeIn').getItem();
            expect(product.madeIn).toBeTruthy();
            expect(product.madeIn.id).toEqual(country.id);


        });
    });

    it('should query zero or one multiplicity association', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country').where('cioc').equal('CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            const Orders = context.model('Order');
            const filterAsync = promisify(Orders.filter).bind(Orders);
            let query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/cioc as country',
                $filter: 'orderedItem/madeIn/cioc eq \'CHN\' or orderedItem/madeIn/cioc eq \'USA\''
            });
            expect(query).toBeTruthy();
            let items = await query.silent().getItems();
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect([
                    'CHN',
                    'USA'
                ].includes(item.country)).toBeTruthy();
            }
            query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/cioc as madeInCountry'
            });
            items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
        });
    });

    it('should query zero or one association items', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country').where('cioc').equal('CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            /**
             * @type {import("../data-model").DataModel}
             */
            const Orders = context.model('Order');
            const filterAsync = promisify(Orders.filter).bind(Orders);
            let query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/cioc as country',
                $filter: 'orderedItem/madeIn/id ne null'
            });
            expect(query).toBeTruthy();
            let items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.country).toBeTruthy();
            }
        });
    });

    it('should query and select object', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country').where('cioc').equal('CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            const Orders: DataModel = context.model('Order');
            const filterAsync = promisify(Orders.filter).bind(Orders);
            let query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn as madeIn',
                $filter: 'orderedItem/madeIn ne null'
            });
            let items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/id as madeIn,orderedItem/madeIn/name as madeInCountry',
                $filter: 'orderedItem/madeIn/cioc eq \'CHN\''
            });
            items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);

            query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/id as madeIn,orderedItem/madeIn/name as madeInCountry',
                $filter: 'orderedItem/madeIn eq null'
            });
            items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
        });
    });

    it('should expand zero or one associated items', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country').where('cioc').equal('CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            /**
             * @type {import("../data-model").DataModel}
             */
            const Orders = context.model('Order');
            const filterAsync = promisify(Orders.filter).bind(Orders);
            let query = await filterAsync({
                $filter: 'orderedItem/madeIn/id ne null',
                $expand: 'orderedItem($expand=madeIn)'
            });
            expect(query).toBeTruthy();
            let items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.madeIn).toBeTruthy();
            }

            query = await filterAsync({
                $filter: 'orderedItem/madeIn/cioc eq \'CHN\' or orderedItem/madeIn/name eq \'Greece\' ',
                $expand: 'orderedItem($expand=madeIn)'
            });

            items = await query.silent().getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.madeIn).toBeTruthy();
            }

        });
    });

    it('should filter zero or one associated items (closures)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product: any = await context.model('Product')
                .where(({name}: {name: string}) => name === 'Samsung Galaxy S4')
                .getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country')
                .where((x: any) => x.cioc === 'CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);
            let items = await context.model('Order')
                .where((x: any) => x.orderedItem.madeIn.id != null)
                .expand((x: any) => x.orderedItem.madeIn)
                .silent()
                .getItems()
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.madeIn).toBeTruthy();
            }
            items = await context.model('Order')
                .where((x: any) => x.orderedItem.madeIn != null)
                .silent()
                .getItems()
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            items = await context.model('Order')
                .where((x: any) => x.orderedItem.madeIn.cioc != null)
                .silent()
                .getItems()
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
        });
    });

    it('should group by a zero or one associated item', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product: any = await context.model('Product')
                .where(({name}: {name: string}) => name === 'Samsung Galaxy S4')
                .getItem();
            expect(product).toBeTruthy();
            let country = await context.model('Country')
                .where((x: any) => x.cioc === 'CHN').getItem();
            expect(country).toBeTruthy();
            product.madeIn = country;
            await context.model('Product').silent().save(product);

            let items = await context.model('Order')
                .where('orderedItem/madeIn').notEqual(null)
                .select('orderedItem/name as orderedItem', 'orderedItem/madeIn/cioc as madeIn')
                .groupBy('orderedItem/name', 'orderedItem/madeIn/cioc')
                .silent()
                .getItems()
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(typeof item.orderedItem === 'string').toBeTruthy();
                expect(item.madeIn).toBeTruthy();
            }

            items = await context.model('Order')
                .where((x: any) => x.orderedItem.madeIn != null)
                .select((x: any) => {
                    return {
                        orderedItem: x.orderedItem.name,
                        madeIn: x.orderedItem.madeIn.cioc
                    }
                })
                .groupBy(
                    (x: any) => x.orderedItem.name,
                    (x: any) => x.orderedItem.madeIn.cioc
                    )
                .silent()
                .getItems()
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(typeof item.orderedItem === 'string').toBeTruthy();
                expect(item.madeIn).toBeTruthy();
            }
        });
    });

    it('should use privileges', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            let product = await context.model('Product').where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            const newReview =  await context.model('Review').silent().save({
                reviewBody: 'This an internal review for a product and it can be accessed by admins only',
                reviewRating: 85
            })
            await context.model('Product').silent().save(Object.assign(product, {
                internalReview: newReview
            }));
            /**
             * @type {import("../data-model").DataModel}
             */
            const Products = context.model('Product');
            const filterAsync = promisify(Products.filter).bind(Products);
            let query = await filterAsync({
                $filter: 'internalReview ne null',
                $expand: 'internalReview'
            });
            expect(query).toBeTruthy();
            let items = await query.getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBe(0);
            // use admin
            Object.assign(context, {
                user: {
                    name: 'alexis.rees@example.com'
                }
            });
            // create query again
            query = await filterAsync({
                $filter: 'internalReview ne null',
                $expand: 'internalReview'
            });
            items = await query.getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);

            query = await filterAsync({
                $select: 'id, name, internalReview/reviewRating as reviewRating',
                $filter: 'internalReview ne null',
            });
            
            items = await query.getItems();
            expect(Array.isArray(items)).toBeTruthy()
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].reviewRating).toBeTruthy();
        });
    });

    it('should use $filter expression', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product')
            let product = await Products.where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            const productDescriptions =  [{
                description: 'This is a new product description',
                inLanguage: 'en'
            }, {
                description: 'Ceci est une nouvelle description de produit',
                inLanguage: 'fr'
            }];
            await Products.silent().save(Object.assign(product, {
                productDescriptions
            }));
            product = await Products.where('name').equal('Samsung Galaxy S4').expand('productDescription').getItem();
            expect(product).toBeTruthy();
            expect(product.productDescription).toBeTruthy();
            expect(product.productDescription.description).toEqual('This is a new product description');
        });
    });

    it('should use $filter expression with select', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product')
            let product = await Products.where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            const productDescriptions =  [{
                description: 'This is a new product description',
                inLanguage: 'en'
            }, {
                description: 'Ceci est une nouvelle description de produit',
                inLanguage: 'fr'
            }];
            await Products.silent().save(Object.assign(product, {
                productDescriptions
            }));
            let items = await Products.select(
                (x: any) => {
                    return {
                        id: x.id,
                        name: x.name,
                        productDescription: x.productDescription.description
                    }
                }
            ).where('name').equal('Samsung Galaxy S4').getItems();
            expect(items).toBeTruthy();
            expect(items.length).toBe(1);
            (context as DataContextWithCulture).culture('fr');
            items = await Products.select(
                (x: any) => {
                    return {
                        id: x.id,
                        name: x.name,
                        productDescription: x.productDescription.description
                    }
                }
            ).where('name').equal('Samsung Galaxy S4').getItems();
            expect(items).toBeTruthy();
            expect(items.length).toBe(1);
            expect(items[0].productDescription).toEqual('Ceci est une nouvelle description de produit');
        });
    });

    it('should use $filter expression with nested select', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product')
            let product = await Products.where('name').equal('Samsung Galaxy S4').getItem();
            expect(product).toBeTruthy();
            const productDescriptions =  [{
                description: 'This is a new product description',
                inLanguage: 'en'
            }, {
                description: 'Ceci est une nouvelle description de produit',
                inLanguage: 'fr'
            }];
            await Products.silent().save(Object.assign(product, {
                productDescriptions
            }));
            const Orders = context.model('Order');
            (context as DataContextWithCulture).culture('en');
            let items = await Orders.select(
                (x: any) => {
                    return {
                        id: x.id,
                        product: x.orderedItem.name,
                        productDescription: x.orderedItem.productDescription.description
                    }
                }
            ).where((x: any) => {
                return x.orderedItem.name === 'Samsung Galaxy S4'
            }).silent().getItems();
            expect(items).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].productDescription).toEqual('This is a new product description');
        });
    });

    
});
