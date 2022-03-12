import {DataExpandResolver} from '../data-expand-resolver';
fdescribe('DataExpandResolver', () => {
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
    it('should parse `orders($expand=customer($expand=address))`', () => {
        const resolver = new DataExpandResolver();
        const res = resolver.test('orders($expand=customer($expand=address))');
        expect(res).toEqual([{
            name: 'orders',
            options: {
                $expand: 'customer($expand=address)'
            }
        }]);
    });
});