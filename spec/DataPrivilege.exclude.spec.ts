import {TestUtils} from './adapter/TestUtils';
import { TestApplication } from './TestApplication';
import { DataContext } from '../types';
import {DataModelFilterParser} from '../data-model-filter.parser';
import { at } from 'lodash';
import { DataPermissionExclusion } from '../data-permission';
import { DataConfigurationStrategy } from '../data-configuration';
import { resolve } from 'path';
import { cloneDeep } from 'lodash';

describe('DataPrivilege', () => {

    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        // set default adapter
        app.getConfiguration().setSourceAt('adapters', [
            {
                name: 'test-local',
                invariantName: 'test',
                default: true,
                options: {
                    database: resolve(__dirname, 'test2/db/local.db')
                }
            }
        ])
        context = app.createContext();
        return done();
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
        let result: any[] = await (context.db as any).executeAsync(queryUsers.query);
        expect(result.length).toBeTruthy();

        q1 = await parser.parseAsync('indexof(context/user/authenticationScope, \'profile\') eq 0');
        expect(q1).toBeTruthy();
        queryUsers.query.select([].concat(addSelect));
        Object.assign(queryUsers.query, {
            $where: q1.$where,
            $expand: q1.$expand,
            // $fixed: true
        });
        result = await (context.db as any).executeAsync(queryUsers.query);
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
        const originalModel = cloneDeep(model);
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
        // restore model
        app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(originalModel);
    });


    it('should validate context scope on insert', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: {
                    name: 'luis.nash@example.com',
                    authenticationScope: 'profile email'
                }
            });
            const customer = await context.model('Person').where('user/name').equal('luis.nash@example.com').getItem();
            expect(customer).toBeTruthy();
            // update privileges
            const model = app.getConfiguration().getStrategy(DataConfigurationStrategy).getModelDefinition('Order');
            const originalModel = cloneDeep(model);
            const index = model.privileges.findIndex((item: any) => {
                return item.type === 'self' && item.filter === 'customer/user eq me() and orderStatus/alternateName eq \'OrderProcessing\'';
            });
            if (index >= 0) {
                model.privileges.splice(index, 1);
            }
            model.privileges.push({
                type: 'self',
                mask: 14,
                filter: 'customer/user eq me() and orderStatus/alternateName eq \'OrderProcessing\'',
                scope: [
                    'orders'
                ]
            });
            app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(model);
            // try to create order
            const orderStatus = {
                alternateName: 'OrderProcessing'
            };
            const orderedItem = await context.model('Product').where('category').equal('Laptops').orderBy('price').getItem();
            expect(orderedItem).toBeTruthy();
            let newOrder = {
                orderStatus,
                orderedItem,
                customer
            }
            await expect(context.model('Order').save(newOrder)).rejects.toThrowError('Access Denied');
            // add scope
            Object.assign(context, {
                user: {
                    name: 'luis.nash@example.com',
                    authenticationScope: 'profile email orders'
                }
            });
            newOrder = {
                orderStatus,
                orderedItem,
                customer
            }
            await expect(context.model('Order').save(newOrder)).resolves.toBeTruthy();
            // restore model
            app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(originalModel);
        });
    });


    it('should validate empty privileges', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: {
                    name: 'luis.nash@example.com',
                    authenticationScope: 'profile email'
                }
            });
            const newValue = {
                name: 'test',
                alternateName: 'test',
                description: 'test'
            };
            const Values = context.model('AnotherStructuredValue');
            expect(Values.privileges.length).toBeFalsy();
            await expect(Values.save(newValue)).rejects.toThrowError('Access Denied');
        });
    });

    it('should validate empty privileges after exclusion', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            Object.assign(context, {
                user: {
                    name: 'luis.nash@example.com',
                    authenticationScope: 'profile email'
                }
            });
            let newValue = {
                name: 'test',
                alternateName: 'test',
                description: 'test'
            };
            const model = app.getConfiguration().getStrategy(DataConfigurationStrategy).getModelDefinition('AnotherStructuredValue');
            const originalModel = cloneDeep(model);
            model.privileges.push({
                type: 'self',
                mask: 15,
                filter: 'alternateName eq \'test\'',
                scope: [
                    'test'
                ]
            });
            app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(model);
            const Values = context.model('AnotherStructuredValue');
            expect(Values.privileges.length).toBeTruthy();
            await expect(Values.save(newValue)).rejects.toThrowError('Access Denied');
            Object.assign(context, {
                user: {
                    name: 'luis.nash@example.com',
                    authenticationScope: 'profile email test'
                }
            });
            newValue = {
                name: 'test',
                alternateName: 'test',
                description: 'test'
            };
            await expect(Values.save(newValue)).resolves.toBeTruthy();
            app.getConfiguration().getStrategy(DataConfigurationStrategy).setModelDefinition(originalModel);
        });
    });


});