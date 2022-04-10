import { DataApplication } from '../data-application';
import { resolve } from 'path';
import { TraceUtils } from '@themost/common';
import { DataConfigurationStrategy } from '../data-configuration';
import { OnExecuteNestedQueryable } from '../OnExecuteNestedQueryable';
import { TestUtils } from './adapter/TestUtils';

describe('OnExecuteNestedQueryable', () => {
    let app: DataApplication;
    beforeAll((done) => {
        app = new DataApplication(resolve(__dirname, 'test2'));
        const configuration = app.getConfiguration();
        configuration.setSourceAt('adapterTypes', [
            {
                'name':'Test Data Adapter', 
                'invariantName': 'test',
                'type': resolve(__dirname, 'adapter/TestAdapter')
            }
        ]);
        configuration.setSourceAt('adapters', [
            { 
                'name': 'test-storage',
                'invariantName': 'test',
                'default':true,
                "options": {
                }
            }
        ]);
        // reset data configuration
        configuration.useStrategy(DataConfigurationStrategy, DataConfigurationStrategy);
        return done();
    });
    afterAll(async () => {
        await TestUtils.finalize(app);
    })
    it('should find listener', () => {
        expect(app).toBeTruthy();
        const context = app.createContext();
        const model = context.model('Product');
        expect(model).toBeTruthy();
        let listeners = model.rawListeners('before.execute');
        const beforeExecute = OnExecuteNestedQueryable.prototype.beforeExecute;
        let listener = listeners.find((item) => {
            return item === beforeExecute;
        });
        expect(listener).toBeTruthy();
        model.removeListener('before.execute', beforeExecute);
        listeners = model.rawListeners('before.execute');
        listener = listeners.find((item) => {
            return item === beforeExecute;
        });
        expect(listener).toBeFalsy();
    });

    it('should use nested query', async () => {
        const context = app.createContext();
        let Actions = context.model('Action');
        const beforeExecute = OnExecuteNestedQueryable.prototype.beforeExecute;
        Actions.removeListener('before.execute', beforeExecute);
        await expect(Actions.where('actionStatus/alternateName')
            .equal('CompletedActionStatus').silent().getItems()).rejects.toBeTruthy();
        Actions = context.model('Action');
        await expect(Actions.where('actionStatus/alternateName').equal('CompletedActionStatus').silent().getItems())
            .resolves.toBeTruthy();
    });

    it('should use nested many-to-one query', async () => {
        const context = app.createContext();
        let Orders = context.model('Order');
        await expect(Orders.where('customer/gender/alternateName')
        .equal('Female').silent().getItems()).resolves.toBeTruthy();
    });

    it('should use nested one-to-many query', async () => {
        const context = app.createContext();
        let People = context.model('Person');
        await expect(People.where('orders/orderStatus/alternateName')
            .equal('OrderProblem').silent().getItems()).resolves.toBeTruthy();
    });

});