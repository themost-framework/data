import { DataContext } from '../index';
import { DataApplication } from '../index';
import { resolve } from 'path';

describe('DataQueryable', () => {
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

    it('should use DataModel.expand(string) for many-to-many association', async () => {
        let item = await context.model('Group')
            .where('name').equal('Administrators')
            .silent()
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

    it('should use DataModel.expand(string)', async () => {
        let list = await context.model('Person').asQueryable()
            .select('id','familyName', 'givenName')
            .expand('orders')
            .silent().skip(5).take(5).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();
    });

    it('should use DataModel.expand(string)', async () => {
        let list = await context.model('Order').asQueryable()
            .expand('customer')
            .silent().take(10).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();

        await expectAsync(
            context.model('Order').asQueryable()
                .expand('missingAttribute')
                .silent().take(10).getItems()
        ).toBeRejected();

    });

    it('should use DataModel.expand(object)', async () => {
        let list = await context.model('Order')
            .where('customer').notEqual(null)
            .expand({
                name: 'customer',
                options: {
                    $select:'id,familyName,givenName'
                }
            })
            .silent().take(10).getList();
        expect(list).toBeTruthy();
        expect(list.value).toBeTruthy();
        list.value.forEach((item) => {
            expect(item.customer).toBeTruthy();
            const actual = Object.keys(item.customer).length;
            expect(actual).toBe(3);
        });
    });

});
