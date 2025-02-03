import { DataContext } from '../types';
import { SelectObjectQuery } from '../select-object-query';
import { TestApplication } from './TestApplication';
import { resolve } from 'path';
import { promisify } from 'util';
import { DataQueryable } from '../data-queryable';


describe('SelectParser', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(process.cwd(), 'spec/test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    })
    it('should select object', async () => {
        const Orders = context.model('Order').silent();
        const selectObject = new SelectObjectQuery(Orders);
        // get order
        const item = await Orders.where('customer/email').equal('jesse.hawkins@example.com')
            .and('orderStatus/name').equal('Processing')
            .getItem();
        expect(item).toBeTruthy();
        const query = selectObject.select(item);
        expect(query).toBeTruthy();
        expect(query.$fixed).toBeTruthy();
        // parse filter
        const filterAsync: (params: any) => Promise<DataQueryable> = promisify(Orders.filter).bind(Orders);
        const q: DataQueryable = await filterAsync({
            '$filter': 'orderStatus/name eq \'Processing\''
        });
        const { $prepared, $where, $expand } = q.query as any;
        expect($expand).toBeTruthy();
        // append query params
        Object.assign(query, {
            $where,
            $prepared,
            $expand
        });
        const executeAsync: (query:any, values:Array<any>) => Promise<any[]> = promisify(context.db.execute).bind(context.db)
        const results = await executeAsync(query, []);
        expect(results).toBeTruthy();
        expect(results.length).toEqual(1);
        const [result] = results;
        expect(result.id).toEqual(item.id);
    });
});