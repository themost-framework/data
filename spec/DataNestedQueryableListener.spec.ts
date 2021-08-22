import { DataApplication } from '../data-application';
import { resolve } from 'path';
import { TraceUtils } from '@themost/common';
import { DataConfigurationStrategy } from '../data-configuration';
import { DataNestedQueryableListener } from '../data-nested-queryable-listener';

describe('DataNestedQueryableListener', () => {
    let app: DataApplication;
    beforeAll((done) => {
        app = new DataApplication(resolve(__dirname, 'empty'));
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
    it('should find listener', () => {
        expect(app).toBeTruthy();
        const context = app.createContext();
        const model = context.model('Product');
        expect(model).toBeTruthy();
        let listeners = model.rawListeners('before.execute');
        const beforeExecute = DataNestedQueryableListener.prototype.beforeExecute;
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
        const beforeExecute = DataNestedQueryableListener.prototype.beforeExecute;
        Actions.removeListener('before.execute', beforeExecute);
        await expectAsync(Actions.where('actionStatus/alternateName').equal('CompletedActionStatus').silent().getItems()).toBeRejected();
        Actions = context.model('Action');
        await expectAsync(Actions.where('actionStatus/alternateName').equal('CompletedActionStatus').silent().getItems()).toBeResolved();
    });

    it('should use nested one-to-many query', async () => {
        const context = app.createContext();
        let Orders = context.model('Order');
        await expectAsync(Orders.where('customer/gender/alternateName').equal('Female').silent().getItems()).toBeResolved();
    });

});