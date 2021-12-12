import { TestApplication } from './TestApplication';
import { DataContext, DataObjectAssociationError } from '../index';
import { resolve } from 'path';
import { TestUtils } from './adapter/TestUtils';

describe('DataObjectAssociationListener', () => {
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

    fit('should parse $select', async () => {

        const Orders = context.model('Order');
        const query = await Orders.filterAsync({
            $select: 'id,year(orderedItem/releaseDate) as productReleaseDate',
            $top: 25
        });
        const items = await query.orderByDescending('orderDate').silent().getItems();
        expect(items).toBeInstanceOf(Array);
    });

});
