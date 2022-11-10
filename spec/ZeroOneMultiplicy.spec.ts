import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import {TestUtils} from "./adapter/TestUtils";
import {promisify} from 'util';

describe('ZeroOrOneMultiplicity', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        app.getConfiguration().getSourceAt('adapters').unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
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
            /**
             * @type {import("../data-model").DataModel}
             */
            const Orders = context.model('Order');
            const filterAsync = promisify(Orders.filter).bind(Orders);
            let query = await filterAsync({
                $select: 'id,orderedItem/name as productName,orderedItem/madeIn/cioc as country',
                $filter: 'orderedItem/madeIn/cioc eq \'CHN\' or orderedItem/madeIn/cioc eq \'USA\''
            });
            expect(query).toBeTruthy();
            let items = await query.silent().getItems();
            expect(items).toBeInstanceOf(Array);
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
            expect(items).toBeInstanceOf(Array);
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
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.country).toBeTruthy();
            }
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
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.madeIn).toBeTruthy();
            }

            query = await filterAsync({
                $filter: 'orderedItem/madeIn/cioc eq \'CHN\' or orderedItem/madeIn/name eq \'Greece\' ',
                $expand: 'orderedItem($expand=madeIn)'
            });

            items = await query.silent().getItems();
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.madeIn).toBeTruthy();
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
            expect(items).toBeInstanceOf(Array);
            expect(items.length).toBe(0);
        });
    });

    
});
