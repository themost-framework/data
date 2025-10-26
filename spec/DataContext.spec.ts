import {TestApplication, TestApplication2} from './TestApplication';
import {DataContext, UserService} from '@themost/data';
import {firstValueFrom} from 'rxjs';

describe('DataContext', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication2();
        app.useService(UserService);
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should have user$', async () => {
        const user = await firstValueFrom(context.user$);
        expect(user?.name).toBeFalsy();
        context.setUser({
            name: 'alexis.rees@example.com'
        });
        const user2 = await firstValueFrom(context.user$);
        expect(user2?.name).toBe('alexis.rees@example.com');
        context.switchUser({
            name: 'james.may@example.com'
        });
        const user3 = await firstValueFrom(context.user$);
        expect(user3?.name).toBe('james.may@example.com');
    });

    it('should have interactiveUser$', async () => {
        let user = await firstValueFrom(context.interactiveUser$);
        expect(user?.name).toBeFalsy();
        context.setInteractiveUser({
            name: 'alexis.rees@example.com'
        });
        user = await firstValueFrom(context.interactiveUser$);
        expect(user?.name).toBe('alexis.rees@example.com');
    });

    it('should use different context', async () => {
        context.switchUser({
            name: 'james.may@example.com'
        });
        let user = await firstValueFrom(context.user$);
        expect(user?.name).toBe('james.may@example.com');

        const otherContext = app.createContext();
        otherContext.setUser({
            name: 'alexis.rees@example.com'
        });
        user = await firstValueFrom(otherContext.user$);
        expect(user?.name).toBe('alexis.rees@example.com');
        user = await firstValueFrom(context.user$);
        expect(user?.name).toBe('james.may@example.com');

    });

    it('should set user', async () => {
        context.user = null;
        let user = await firstValueFrom(context.user$);
        expect(user?.name).toBeFalsy();
        context.user = {
            name: 'alexis.rees@example.com'
        };
        user = await firstValueFrom(context.user$);
        expect(user?.name).toBe('alexis.rees@example.com');
        context.user = {
            name: 'james.may@example.com'
        };
        user = await firstValueFrom(context.user$);
        expect(user?.name).toBe( 'james.may@example.com');
    });

    it('should set user name', async () => {
        context.user = null;
        let user = await firstValueFrom(context.user$);
        expect(user?.name).toBeFalsy();
        context.user = {
            name: 'alexis.rees@example.com'
        };
        expect(context.user.name).toBe('alexis.rees@example.com');
        user = await firstValueFrom(context.user$);
        expect(user?.name).toBe('alexis.rees@example.com');
        context.user.name =  'james.may@example.com';
        user = await firstValueFrom(context.user$);
        expect(user?.name).toBe( 'james.may@example.com');
    });

});