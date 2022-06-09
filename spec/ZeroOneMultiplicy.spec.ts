import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import {TestUtils} from "./adapter/TestUtils";

fdescribe('ZeroOrOneMultiplicity', () => {
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



});
