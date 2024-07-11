import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import {TestUtils} from "./adapter/TestUtils";

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


fdescribe('ZeroOrOneMultiplicity', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
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
            (context as DataContextWithCulture).culture('fr');
            product = await Products.where('name').equal('Samsung Galaxy S4').expand('productDescription').getItem();
            expect(product).toBeTruthy();
            expect(product.productDescription).toBeTruthy();
            expect(product.productDescription.description).toEqual('Ceci est une nouvelle description de produit');
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
                'id',
                'orderedItem/name as product',
                'orderedItem/productDescription/description as productDescription'
            ).where('orderedItem/name').equal('Samsung Galaxy S4').silent().getItems();
            expect(items).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].productDescription).toEqual('This is a new product description');
            (context as DataContextWithCulture).culture('fr');
            items = await Orders.select(
                'id',
                'orderedItem/name as product',
                'orderedItem/productDescription/description as productDescription'
            ).where('orderedItem/name').equal('Samsung Galaxy S4').silent().getItems();
            expect(items).toBeTruthy();
            expect(items.length).toBeGreaterThan(0);
            expect(items[0].productDescription).toEqual('Ceci est une nouvelle description de produit');

        });
    });


});
