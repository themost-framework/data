import {TestApplication} from './TestApplication';
import { DataContext } from '@themost/data';
import { resolve } from 'path';
import { UserService } from '../UserService';
import { firstValueFrom, BehaviorSubject } from 'rxjs';

describe('UserService', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(process.cwd(), 'spec/test2'));
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should return user', async () => {
        const userService = new UserService(app);
        const user = await userService.getUser(context, 'alexis.rees@example.com');
        expect(user).toBeTruthy();
        expect(user.name).toBe('alexis.rees@example.com');
    });

    it('should return anonymous user', async () => {
        const userService = new UserService(app);
        const getItemSpy = jest.spyOn(UserService.prototype, 'getAnonymousUser');
        let anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).toHaveBeenCalled();
        expect(anonymous).toBeTruthy();
        getItemSpy.mockClear();
        expect(anonymous.name).toBe('anonymous');
        anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).not.toHaveBeenCalled();
    });

    it('should refresh anonymous user', async () => {
        const userService = new UserService(app);
        let anonymous = await userService.getAnonymousUser(context);
        expect(anonymous).toBeTruthy();
        userService.refreshAnonymousUser$.next(anonymous);
        const getItemSpy = jest.spyOn(UserService.prototype, 'getAnonymousUser');
        getItemSpy.mockClear();
        anonymous = await firstValueFrom(userService.anonymousUser$);
        expect(getItemSpy).not.toHaveBeenCalled();
    });

});