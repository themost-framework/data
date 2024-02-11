import {TestUtils} from './adapter/TestUtils';
import { TestApplication2 } from './TestApplication';
import {DataAdapter, DataContext} from '../types';
import {DataModelFilterParser} from '../data-model-filter.parser';
import { at } from 'lodash';
import { DataPermissionExclusion } from '../data-permission';
import { DataConfigurationStrategy } from '../data-configuration';

describe('DataPrivilege', () => {

    let app: TestApplication2;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication2();
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should validate exclude expression', async () => {
        const Users = context.model('User');
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile'
            }
        })
        const queryUsers = Users.asQueryable();
        const parser = new DataModelFilterParser(Users);
        const addSelect: any[] = [
            {
                "name": {
                    $value: (context as any).user.name
                }
            }
        ];
        parser.resolvingMember.subscribe(async (event) => {
            const propertyPath = event.member.split('/');
            if (propertyPath[0] === 'context') {
                propertyPath.splice(0, 1);
                const property = at(context as any, propertyPath.join('.'))[0];
                const propertyName = propertyPath[propertyPath.length - 1];
                const exists = addSelect.findIndex((item) => Object.prototype.hasOwnProperty.call(item, propertyPath));
                if (exists < 0) {
                    const select = {};
                    Object.defineProperty(select, propertyName , {
                        enumerable: true,
                        configurable: true,
                        value: {
                            $value: property
                        }
                    });
                    addSelect.push(select);
                }
                event.result = {
                    $select: propertyName
                }
            }
        });
        let q1 = await parser.parseAsync('context/user/authenticationScope eq \'profile\' or context/user/authenticationScope eq \'email\'');
        expect(q1).toBeTruthy();
        queryUsers.query.select([].concat(addSelect));
        Object.assign(queryUsers.query, {
            $where: q1.$where,
            $expand: q1.$expand,
            // $fixed: true
        });
        let result: any[] = await (context.db as DataAdapter).executeAsync(queryUsers.query, []);
        expect(result.length).toBeTruthy();

        q1 = await parser.parseAsync('indexof(context/user/authenticationScope, \'profile\') eq 0');
        expect(q1).toBeTruthy();
        queryUsers.query.select([].concat(addSelect));
        Object.assign(queryUsers.query, {
            $where: q1.$where,
            $expand: q1.$expand,
            // $fixed: true
        });
        result = await (context.db as DataAdapter).executeAsync(queryUsers.query, []);
        expect(result.length).toBeTruthy();

    });
    it('should use permission exclusion', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile'
            }
        });
        const exclusion = new DataPermissionExclusion(context.model('Orders'));
        const result = await exclusion.shouldExcludeAsync({
            mask: 15,
            type: 'self',
            account: 'Employees',
            exclude: 'indexof(context/user/authenticationScope, \'sales\') lt 0'
        });
        expect(result).toBeTruthy();
    });

    it('should use context scope', async () => {
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile,email'
            }
        });
        let items = await context.model('Order').where('customer/email').equal('luis.nash@example.com').getItems();
        expect(items.length).toBeTruthy();
        const model = app.getConfiguration().getStrategy(DataConfigurationStrategy).getModelDefinition('Order');
        const privilege = model.privileges.find((item: any) => item.type === 'self' && item.filter === 'customer/user eq me()');
        expect(privilege).toBeTruthy();
        privilege.scope = [
            'orders'
        ];
        app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(model);
        items = await context.model('Order').where('customer/email').equal('luis.nash@example.com').getItems();
        expect(items.length).toBeFalsy();
        // new scope
        Object.assign(context, {
            user: {
                name: 'luis.nash@example.com',
                authenticationScope: 'profile email orders'
            }
        });
        items = await context.model('Order').where('customer/email').equal('luis.nash@example.com').getItems();
        expect(items.length).toBeTruthy();
    });
});
