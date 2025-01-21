import {TestApplication, TestApplication2} from './TestApplication';
import { DataContext, executeInUnattendedMode, executeInUnattendedModeAsync, ValueFormatter, ValueDialect } from '@themost/data';
import moment from 'moment';
import MD5 from 'crypto-js/md5';

describe('ValueFormatter', () => {
    let app: TestApplication;
    let context: DataContext;
    beforeAll((done) => {
        app = new TestApplication2();
        context = app.createContext();
        return done();
    });
    afterAll(async () => {
        await context.finalizeAsync();
        await app.finalize();
    });

    it('should use $now function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value = await formatter.format({
            $now: []
        });
        expect(value instanceof Date).toBeTruthy();
    });

    it('should use $randomString function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomString: [
                10
            ]
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(10);
    });

    it('should use $newGuid function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $newGuid: 1
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(36);
    });

    it('should use $randomString with named params', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomString: {
                length: 10
            }
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(10);
    });

    it('should use $randomInt with named params', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomInt: {
                min: 10,
                max: 20
            }
        });
        expect(typeof value === 'number').toBeTruthy();
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThanOrEqual(20);
    });

    it('should use $randomPassword function', async () => {
        const formatter = new ValueFormatter(context);
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $randomPassword: [
                16
            ]
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value.length).toBe(16);
    });

    
    it('should use property syntax', async () => {
        const formatter = new ValueFormatter(context, null, {
            name: 'Macbook Pro 13',
            additionalType: 'Product',
            productDimensions: {
                width: 30,
                height: 20,
                depth: 5
            }
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $value: '$$target.additionalType'
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value).toBe('Product');
        value = await formatter.format({
            $value: '$$target.productDimensions.width'
        });
        expect(typeof value === 'number').toBeTruthy();
        expect(value).toBe(30);
    });

    it('should use $$model function', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'));
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $value: '$$model.name'
        });
        expect(typeof value === 'string').toBeTruthy();
        expect(value).toBe('Product');
    });

    it('should use $newid function', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'));
        expect(formatter).toBeTruthy();
        const value: string = await formatter.format({
            $newid: 1
        });
        expect(typeof value === 'number').toBeTruthy();
    });

    it('should use date functions', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14)
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $dateAdd: {
                startDate: '$$target.dateReleased',
                unit: 'day',
                amount: 10
            }
        });
        expect(value).toStrictEqual(moment(new Date(2024, 11, 24)).toDate());
        value = await formatter.format({
            $dateSubtract: {
                startDate: '$$target.dateReleased',
                unit: 'day',
                amount: 10
            }
        });
        expect(value).toStrictEqual(moment(new Date(2024, 11, 4)).toDate());
    });

    it('should use math functions', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            price: 949.458,
            dateReleased: new Date(2024, 11, 14)
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $floor: {
                value: '$$target.price'
            }
        });
        expect(value).toBe(949);
        value = await formatter.format({
            $round: {
                value: '$$target.price',
                place: 2
            }
        });
        expect(value).toBe(949.46);
        value = await formatter.format({
            $ceil: {
                value: '$$target.price'
            }
        });
        expect(value).toBe(950);
        
    });

    it('should use comparison operators', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14)
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $gt: [
                new Date(2024, 11, 1),
                '$$target.dateReleased',
            ]
        });
        expect(value).toBeFalsy();
    });

    it('should use $or operator', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $or: [
                {
                    $gt: [
                        '$$target.dateReleased',
                        new Date(2024, 11, 1)
                    ]
                },
                {
                    $lt: [
                        '$$target.price',
                        500
                    ]
                }
            ]
        });
        expect(value).toBeTruthy();
    });

    it('should use $and operator', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $and: [
                {
                    $gt: [
                        '$$target.dateReleased',
                        new Date(2024, 11, 1)
                    ]
                },
                {
                    $lt: [
                        '$$target.price',
                        500
                    ]
                }
            ]
        });
        expect(value).toBeFalsy();
    });

    it('should use $cond operator', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $cond: {
                if: {
                    $gt: [
                        '$$target.dateReleased',
                        new Date(2024, 11, 1)
                    ]
                },
                then: 'Released',
                else: 'Not Released'
            }
        });
        expect(value).toBe('Released');
    });

    it('should use $replaceAll operator', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $replaceAll: {
                input: {
                    $newGuid: 1
                },
                find: '-',
                replacement: ''
            }
        });
        expect(value).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should use $replaceOne operator', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $replaceOne: {
                input: {
                    $newGuid: 1
                },
                find: '-',
                replacement: ''
            }
        });
        expect(value).toMatch(/^[a-f0-9\-]{35}$/);
    });

    it('should use $query function', async () => {
        const formatter = new ValueFormatter(context, context.model('Product'), {
            name: 'Macbook Pro 13',
            dateReleased: new Date(2024, 11, 14),
            price: 949.458,
            defaultOrderStatus: {
                name: 'Processing',
            }
        });
        expect(formatter).toBeTruthy();
        let value: any = await formatter.format({
            $query: {
                $collection: 'OrderStatusType',
                $select: {
                    value: '$alternateName'
                },
                $where: {
                    $eq: [
                        '$name',
                        '$$target.defaultOrderStatus.name'
                    ]
                },
                $order: [
                    {
                        $asc: '$name'
                    }
                ]
            }
        });
        expect(value).toBe('OrderProcessing');
    });

    it('should use $query function with nested joins', async () => {
        await executeInUnattendedModeAsync(context, async () => {
            const product = await context.model('Product').where('name').equal('Microsoft Sculpt Mobile Mouse').getItem();
            expect(product).toBeTruthy();
            const formatter = new ValueFormatter(context, context.model('Product'), product);
            let lastOrder: any = await formatter.format({
                $query: {
                    $collection: 'Order',
                    $select: {
                        value: '$orderDate'
                    },
                    $where: {
                        $and: [
                            {
                                $eq: [
                                    '$orderedItem',
                                    '$$target.id'
                                ]
                            },
                            {
                                $eq: [
                                    '$orderStatus.alternateName',
                                    'OrderDelivered'
                                ]
                            }
                        ]
                    },
                    $order: [
                        {
                            $desc: '$orderDate'
                        }
                    ]
                }
            });
            expect(lastOrder).toBeTruthy();
        });
    });

    it('should use custom functions', async () => {
        Object.assign(ValueDialect.prototype, {
            async $initials(first: string, last: string) {
                return `${first.charAt(0)}${last.charAt(0)}`;
            }
        });
        const formatter = new ValueFormatter(context, context.model('Person'), {
            givenName: 'John',
            familyName: 'Doe'
        });
        const initials = await formatter.format({
            $initials: {
                first: '$$target.givenName',
                last: '$$target.familyName'
            }
        });
        expect(initials).toBe('JD');
    });

    it('should use register for custom dialect functions', async () => {
        ValueFormatter.register('initials', {
            async $md5 (value: any) {
                return MD5(value).toString();
            }
        });
        const formatter = new ValueFormatter(context, context.model('Person'), {
            givenName: 'John',
            familyName: 'Doe'
        });
        const hash = await formatter.format({
            $md5: {
                value: 'Hello World'
            }
        });
        expect(hash).toBe(MD5('Hello World').toString());
    });
    

});