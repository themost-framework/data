import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication } from './TestApplication';
import { TestUtils } from './adapter/TestUtils';
import { round } from '@themost/query';
import { executeInUnattendedModeAsync } from '../UnattendedMode';
const {executeInTransaction} = TestUtils;

describe('DataQueryable.select()', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    })
    it('should use a simple select closure', async () => {
        const items = await context.model('Product').asQueryable()
        .select<{ id?: number, name: string, price?: number }>(({id, name, price}) => ({
            id,
            name,
            price
        })).take(10).getItems();
        expect(items.length).toBeGreaterThan(0);
        const [item] = items;
        expect(Object.getOwnPropertyNames(item)).toStrictEqual(['id', 'name', 'price']);
    });

    it('should use round', async () => {
        const items = await context.model('Product').asQueryable()
        .select<{ id?: number, name: string, price?: number }>(({id, name, price}) => {
            return {
                id,
                name,
                price,
                actualPrice: round(price, 2)
            }            
        }).take(10).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.actualPrice).toBeCloseTo(item.price, 2);
        }
    });

    it('should use where closure', async () => {
        const items = await context.model('Product').asQueryable()
        .select<any>(({id, name, price, category}) => {
            return {
                id,
                name,
                price,
                category
            }            
        }).where((x: any) => {
            return x.category === 'Laptops' && x.price > 500;
        }).take(10).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.category).toEqual('Laptops');
            expect(item.price).toBeGreaterThan(500);
        }
    });

    it('should use where closure with params', async () => {
        const targetCategory = 'Laptops';
        const items = await context.model('Product').asQueryable()
        .select<any>(({id, name, price, category}) => {
            return {
                id,
                name,
                price,
                category
            }            
        }).where((x: any, category: string) => {
            return x.category === category;
        }, targetCategory).take(10).getItems();
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
            expect(item.category).toEqual('Laptops');
        }
    });

    it('should use where with nested query', async () => {
        await executeInUnattendedModeAsync(context, async () => {
            const targetCategory = 'Laptops';
            const items = await context.model('Order').asQueryable()
            .where((x: any, category: string) => {
                return x.orderedItem.category === category;
            }, targetCategory).take(25).getItems();
            expect(items.length).toBeGreaterThan(0);
            for (const item of items) {
                expect(item.orderedItem.category).toEqual('Laptops');
            }
        });
    });
    
    
});
