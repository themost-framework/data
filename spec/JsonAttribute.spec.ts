import {TestApplication} from './TestApplication';
import {DataContext} from '../types';
import {resolve} from 'path';
import { TestUtils } from "./adapter/TestUtils";
import pluralize from "pluralize";
import { setSingularRules } from '../data-pluralize';

describe('JsonAttribute', () => {

    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should select json attribute', async () => {
        const Products = context.model('Product').silent();
        const items = await Products.asQueryable().select(
            'id', 'name', 'metadata/color as color'
        ).take(10).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should update json attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver'
            }
            await Products.save(item);
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('metadata/color as color').getItem();
            expect(item).toBeTruthy();
            expect(item.color).toBe('silver');
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.metadata).toBeTruthy();
        });
    });

    it('should throw error on invalid json', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver',
                message : 'hello'
            }
            await expect(Products.save(item)).rejects.toThrow('The given structured value seems to be invalid. The property \'message\' is not defined in the target model.');
        });
    });

    it('should use pluralize rules', async () => {
        expect(pluralize.isSingular('metadata')).toBeFalsy();
        setSingularRules(pluralize);
        expect(pluralize.isSingular('metadata')).toBeTruthy();
    });

    it('should select json attribute from $select', async () => {
        const Products = context.model('Product').silent();
        const options = {
            $select: 'id,name,metadata/color as color',
            $top: 10
        }
        const q = await Products.filterAsync(options);
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

});
