import { DataContext } from '../index';
import { DataApplication } from '../index';
import { resolve } from 'path';

fdescribe('DataQueryable', () => {
    let app: DataApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new DataApplication(resolve(__dirname, 'test2'));
        return done();
    });
    beforeEach((done) => {
        context = app.createContext();
        return done();
    });
    afterEach((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });

    it('should use many-to-many association', async () => {
        let item = await context.model('Group')
            .where('name').equal('Administrators')
            .expand('members')
            .getItem();
        expect(item).toBeTruthy();
        expect(item.members).toBeTruthy();
        item = await context.model('User')
            .where('name').equal('alexis.rees@example.com')
            .expand('groups')
            .silent().getItem();
        expect(item).toBeTruthy();

        let list = await context.model('User').asQueryable()
            .expand('groups')
            .silent().skip(5).take(5).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();
    });

    it('should use one-to-many association', async () => {
        let list = await context.model('Person').asQueryable()
            .expand('orders')
            .silent().skip(5).take(5).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();
    });

    it('should get children without selecting foreign key', async () => {
        let list = await context.model('Person').asQueryable()
            .select('id','familyName', 'givenName')
            .expand('orders')
            .silent().skip(5).take(5).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();
    });

});
