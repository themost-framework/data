import { DataContext } from '../index';
import { TestUtils } from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import { OpenDataQuery, OpenDataQueryFormatter, round } from '@themost/query';
import { TraceUtils } from '@themost/common';

async function execute(context: DataContext, query: OpenDataQuery) {
    const queryParams = new OpenDataQueryFormatter().formatSelect(query);
    TraceUtils.log(JSON.stringify(queryParams));
    const q = await context.model('Product').filterAsync(queryParams);
    return await q.getItems();
}

describe('SelectJsonArray', () => {
    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should use json array', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Groups = context.model('Group').silent();
            let group = await Groups.where(((x: { name: string }) => x.name === 'Administrators')).getItem();
            expect(group).toBeTruthy();
            group.tags = [
                'admins',
                'superusers'
            ];
            await Groups.save(group);
            group = await Groups.where(((x: { name: string }) => x.name === 'Administrators')).getItem();
            expect(group.tags).toBeTruthy();
        });
    });

});
