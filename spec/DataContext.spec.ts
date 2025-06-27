import { TestApplication, TestApplication2 } from './TestApplication';
import { DataContext, DataModel, DataObjectAssociationError, DataQueryable, DefaultDataContext, FunctionContext } from '../index';
import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';
import { firstValueFrom } from 'rxjs';

describe('DataContext', () => {

    let app: TestApplication;
    let context: DefaultDataContext;
    beforeAll((done) => {
        app = new TestApplication2();
        context = app.createContext() as DefaultDataContext;
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should create a new DataContext',async () => {
        expect(context).toBeDefined();
        context.user = {
            name: 'alexis.rees@example.com'
        };
        const getItemSpy = jest.spyOn(DataQueryable.prototype, 'getItem');
        let user = await firstValueFrom(context.user$);
        expect(getItemSpy).toHaveBeenCalled();
        expect(user).toBeDefined();
        expect(user.name).toEqual('alexis.rees@example.com');
        getItemSpy.mockClear();
        context.switchUser({
            name: 'anonymous'
        })
        user = await firstValueFrom(context.user$);
        expect(getItemSpy).toHaveBeenCalled();
        getItemSpy.mockClear();
        user = await firstValueFrom(context.user$);
        expect(getItemSpy).not.toHaveBeenCalled();
        expect(user).toBeDefined();
    });

    it('should use function context',async () => {
        expect(context).toBeDefined();
        context.user = {
            name: 'alexis.rees@example.com'
        };
        const getItemSpy = jest.spyOn(DataQueryable.prototype, 'getItem');
        const functionContext = new FunctionContext(context);
        let user = await functionContext.me();
        expect(getItemSpy).toHaveBeenCalled();
        expect(user).toBeDefined();
        getItemSpy.mockClear();
        context.switchUser({
            name: 'anonymous'
        })
        user = await functionContext.me();
        expect(getItemSpy).toHaveBeenCalled();
        getItemSpy.mockClear();
        user = await functionContext.me();
        expect(getItemSpy).not.toHaveBeenCalled();
        expect(user).toBeDefined();
    });

});