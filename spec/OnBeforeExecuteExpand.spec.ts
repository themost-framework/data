import { resolve } from 'path';
import {DataContext, OnBeforeGetExpandableAssociation, OnBeforeGetExpandableJunction} from '../index';
import { TestApplication } from './TestApplication';

describe('OnBeforeExecuteExpand', () => {

    let app: TestApplication;
    let context: DataContext;

    beforeAll(async () => {
        app = new TestApplication(resolve(__dirname, 'test2'));
        context = app.createContext();
    });

    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should get associated objects', async () => {
        context.setUser({
            name: 'james.may@example.com'
        })
        const items = await context.model('Order').on('before.execute', (event, callback) => {
            return new OnBeforeGetExpandableAssociation().beforeExecute(event, callback);
            //return callback();
        }).where('orderStatus/alternateName').equal('OrderPickup').getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
    });

    it('should get associated objects with expression', async () => {
        context.setUser({
            name: 'james.may@example.com'
        })
        const q = await context.model('Order').on('before.execute', (event, callback) => {
            return new OnBeforeGetExpandableAssociation().beforeExecute(event, callback);
        }).filterAsync({
            $filter: 'orderStatus/alternateName eq \'OrderPickup\'',
            $expand: [
                'orderedItem($select=name)',
                'orderStatus($select=name,alternateName)',
                'customer($select=givenName,familyName;$expand=address($select=streetAddress,addressLocality))'
                ].join(',')
        });
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(item).toBeTruthy();
            const keys = Object.keys(item.orderStatus);
            expect(keys).toEqual([ 'name', 'alternateName' ]);
        }
    });

    it('should get nested associated objects', async () => {
        context.setUser({
            name: 'alexis.rees@example.com'
        })
        const q = await context.model('Order').on('before.execute', (event, callback) => {
            return new OnBeforeGetExpandableAssociation().beforeExecute(event, callback);
        }).filterAsync({
            $filter: 'orderStatus/alternateName eq \'OrderPickup\'',
            $expand: [
                'orderedItem($select=name)',
                'paymentMethod($select=name,alternateName)',
                'orderStatus($select=name,alternateName)',
                'customer($select=givenName,familyName;$expand=address($select=streetAddress,addressLocality))'
            ].join(',')
        });
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(item).toBeTruthy();
            const keys = Object.keys(item.orderStatus);
            expect(keys).toEqual([ 'name', 'alternateName' ]);
        }
    });

    it('should get many-to-many association as child', async () => {
        context.setUser({
            name: 'alexis.rees@example.com'
        })
        const q = await context.model('User').on('before.execute', (event, callback) => {
            return new OnBeforeGetExpandableJunction().beforeExecute(event, callback);
        }).filterAsync({
            $select: 'name',
            $expand: [
                'groups($select=name,alternateName)'
            ].join(',')
        });
        const items = await q.take(25).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(item).toBeTruthy();
            expect(Array.isArray(item.groups)).toBeTruthy();
            for (const group of item.groups) {
                expect(group).toBeTruthy();
                const keys = Object.keys(group);
                expect(keys).toEqual([ 'name', 'alternateName' ]);
            }
        }
    });

    it('should get many-to-many association as parent', async () => {
        context.setUser({
            name: 'alexis.rees@example.com'
        })
        const q = await context.model('Group').on('before.execute', (event, callback) => {
            return new OnBeforeGetExpandableJunction().beforeExecute(event, callback);
        }).filterAsync({
            $filter: 'name eq \'Administrators\'',
            $select: 'name',
            $expand: [
                'members($select=name,alternateName)'
            ].join(',')
        });
        const items = await q.take(25).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeTruthy();
        for (const item of items) {
            expect(item).toBeTruthy();
            expect(Array.isArray(item.members)).toBeTruthy();
            for (const member of item.members) {
                expect(member).toBeTruthy();
                const keys = Object.keys(member);
                expect(keys).toEqual([ 'name', 'alternateName' ]);
            }
        }
    });

});
