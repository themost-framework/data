import {DataExpandResolver} from '../data-expand-resolver';
describe('DataExpandResolver', () => {
    it('should parse `orders`', () => {
        const resolver = new DataExpandResolver();
        let res = resolver.test('orders');
        expect(res).toEqual([{
            name: 'orders'
        }]);
    });
    it('should parse `orders,address()`', () => {
        const resolver = new DataExpandResolver();
        expect(resolver.test('orders,address()')).toEqual([{
            name: 'orders'
        },{
            name: 'address',
            options: {}
        }]);
    });
    it('should parse `orders($select=id,orderDate,orderedItem)`', () => {
        const resolver = new DataExpandResolver();
        expect(resolver.test('orders($select=id,orderDate,orderedItem)')).toEqual([{
            name: 'orders',
            options: {
                $select: 'id,orderDate,orderedItem'
            }
        }]);
    });
    it('should parse `orders($select=id,orderDate,orderedItem;$orderby=orderDate desc)`', () => {
        const resolver = new DataExpandResolver();
        expect(resolver.test('orders($select=id,orderDate,orderedItem;$orderby=orderDate desc)')).toEqual([{
            name: 'orders',
            options: {
                $select: 'id,orderDate,orderedItem',
                $orderby: 'orderDate desc'
            }
        }]);
    });
    it('should parse `orders($filter=year(orderDate) ge 2020;$orderby=orderDate desc)`', () => {
        const resolver = new DataExpandResolver();
        let res = resolver.test('orders($filter=year(orderDate) ge 2020;$orderby=orderDate desc)');
        expect(res).toEqual([{
            name: 'orders',
            options: {
                $filter: 'year(orderDate) ge 2020',
                $orderby: 'orderDate desc'
            }
        }]);
    });
    it('should parse `orders($expand=customer($expand=address))`', () => {
        const resolver = new DataExpandResolver();
        let res = resolver.test('orders($expand=customer($expand=address))');
        expect(res).toEqual([{
            name: 'orders',
            options: {
                $expand: 'customer($expand=address)'
            }
        }]);
        res = resolver.test('orders($expand=customer($expand=address)),tags($select=value;$orderby=value)');
        expect(res).toEqual([{
            name: 'orders',
            options: {
                $expand: 'customer($expand=address)'
            }
        }, {
            name: 'tags',
            options: {
                $select: 'value',
                $orderby: 'value'
            }
        }]);
    });
});
