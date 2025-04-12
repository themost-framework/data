import { resolve } from 'path';
import { DataContext } from '../index';
import { TestApplication, TestApplication2 } from './TestApplication';
import { firstValueFrom } from 'rxjs';

describe('DataContext', () => {
    let app: TestApplication2;
    let context: DataContext;
    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    })
    

    it('should get context user', async () => {
        const name = 'alexis.rees@example.com'
        context.user = {
            name
        };
        const spyOnGetUser = jest.spyOn(context, 'getUser')
        const user = await firstValueFrom(context.user$);
        expect(spyOnGetUser).toHaveBeenCalled();
        spyOnGetUser.mockClear();
        expect(user).toBeTruthy();
        expect(user.name).toBe(name);
        await firstValueFrom(context.user$);
        expect(spyOnGetUser).not.toHaveBeenCalled();
    });

    it('should switch context user', async () => {
        let name = 'alexis.rees@example.com';
        context.user = {
            name
        };
        const spyOnGetUser = jest.spyOn(context, 'getUser')
        const user = await firstValueFrom(context.user$);
        expect(spyOnGetUser).toHaveBeenCalled();
        spyOnGetUser.mockClear();
        expect(user).toBeTruthy();
        expect(user.name).toBe(name);
        name = 'luis.nash@example.com';
        context.switchUser({
            name
        });
        const user2 = await firstValueFrom(context.user$);
        expect(spyOnGetUser).toHaveBeenCalled();
        spyOnGetUser.mockClear();
        expect(user2).toBeTruthy();
        expect(user2.name).toBe(name);
    });

    it('should switch context user with assignment', async () => {
        let name = 'alexis.rees@example.com';
        context.user = {
            name
        };
        const spyOnGetUser = jest.spyOn(context, 'getUser')
        const user = await firstValueFrom(context.user$);
        expect(spyOnGetUser).toHaveBeenCalled();
        spyOnGetUser.mockClear();
        expect(user).toBeTruthy();
        expect(user.name).toBe(name);
        name = 'luis.nash@example.com';
        Object.assign(context, {
            user: {
                name
            }
        });
        const user2 = await firstValueFrom(context.user$);
        expect(spyOnGetUser).toHaveBeenCalled();
        spyOnGetUser.mockClear();
        expect(user2).toBeTruthy();
        expect(user2.name).toBe(name);
    });
    
});
