import { TestApplication } from './TestApplication';
import { DataContext, DataFilterResolver } from '../index';
import { resolve } from 'path';

describe('DataQueryable', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        const adapters: Array<any> = app.getConfiguration().getSourceAt('adapters');
        adapters.unshift({
            name: 'test-local',
            invariantName: 'test',
            default: true,
            options: {
                database: resolve(__dirname, 'test2/db/local.db')
            }
        });
        context = app.createContext();
        return done();
    });
    afterAll((done) => {
        if (context) {
            return context.finalize(() => {
                return done();
            });
        }
        return done();
    });
    it('should use DataModel.filter()', async ()=> {
        const query = await context.model('Product').filterAsync({
            $select: 'id,name,price',
            $orderby: 'price desc,name asc',
            $top: 25
        });
        const items = await query.silent().getItems();
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBe(25);
        items.forEach((item) => {
            expect(Object.keys(item)).toEqual([
                'id','name','price'
            ]);
        });
    });

    it('should use select query option', async ()=> {
        let query = await context.model('Product').filterAsync({
            $select: 'id,name,price,year(releaseDate) as releaseYear',
            $orderby: 'price desc',
            $top: 25
        });
        let items = await query.silent().getItems();
        expect(items).toBeInstanceOf(Array);
        expect(items.length).toBe(25);
        items.forEach((item) => {
            expect(Object.keys(item)).toEqual([
                'id','name','price','releaseYear'
            ]);
        });

        query = await context.model('Order').filterAsync({
            $select: 'id,orderedItem/name as productName,orderedItem/price as productPrice,year(orderedItem/releaseDate) as releaseYear',
            $orderby: 'orderedItem/price desc',
            $top: 25
        });
        items = await query.silent().getItems();
        expect(items).toBeInstanceOf(Array);
        items.forEach((item) => {
            expect(Object.keys(item)).toEqual([
                'id','productName','productPrice','releaseYear'
            ]);
            expect(item.releaseYear).toBeTruthy();
        });

    });

});
