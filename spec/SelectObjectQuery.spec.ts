import { DataContext } from '../types';
import { SelectObjectQuery } from '../select-object-query';
import { TestApplication } from './TestApplication';
import { resolve } from 'path';


describe('SelectParser', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication(resolve(process.cwd(), 'spec/test2'));
        context = app.createContext();
    });
    afterAll(async () => {
        await app.finalize();
    })
    it('should select object', async () => {
        const Orders = context.model('Order').silent();
        const selectObject = new SelectObjectQuery(Orders);
        // get order
        const item = await Orders.where('customer/email').equal('jesse.hawkins@example.com').getItem();
        expect(item).toBeTruthy();
        const query = selectObject.select(item);
        expect(query).toBeTruthy();
    })
});