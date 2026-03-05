import {TestApplication} from './TestApplication';
import {DataContext, UserService} from '@themost/data';
import {firstValueFrom, lastValueFrom} from 'rxjs';
import {resolve} from 'path';

describe('DataContext', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(process.cwd(), 'spec/test2'));
        app.useService(UserService);
        context = app.createContext();
        return done();
    });
    beforeEach(() => {
        context.setUser(null);
    })
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should serialize context as empty object', async () => {
        context.setUser({
            name: 'alexis.rees@example.com',
        });
        const user = await firstValueFrom(context.user$);
        const str = JSON.stringify(context);
        expect(str).toEqual(JSON.stringify({
            user: {
                name: 'alexis.rees@example.com',
            }
        }));
    })

    it('should have user$', async () => {
        context.setUser(null);
        const user = await firstValueFrom(context.user$);
        expect(user?.name).toBeFalsy();
        context.setUser({
            name: 'alexis.rees@example.com'
        });
        const user2 = await firstValueFrom(context.user$);
        expect(user2?.name).toBe('alexis.rees@example.com');
        context.setUser({
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
        context.setUser({
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

    it('should get anonymous user', async () => {
        context.user = null;
        let user = await firstValueFrom(context.anonymousUser$);
        expect(user?.name).toBe('anonymous');
    });

    it('should set user again', async () => {
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

});