import {TestApplication2} from './TestApplication';
import {DataContext} from '../types';
import { TestUtils } from "./adapter/TestUtils";

describe('JsonAttribute', () => {

    let app: TestApplication2;
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

    it('should select json attribute', async () => {
        const Products = context.model('Product').silent();
        const items = await Products.asQueryable().select(
            'id', 'name', 'metadata/color as color'
        ).take(10).getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should update json attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('metadata/color as color','metadata/dateCreated as dateCreated').getItem();
            expect(item).toBeTruthy();
            expect(item.color).toBe('silver');
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.metadata).toBeTruthy();
        });
    });

    it('should update and get unknown json attribute', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('extraAttributes/cpu as cpu').getItem();
            expect(item).toBeTruthy();
            expect(item.cpu).toStrictEqual(
                {
                    brand: 'Intel',
                    model: 'Core i5'
                }
            );
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.extraAttributes).toBeTruthy();
        });
    });

    it('should update and get unknown json attribute value', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('extraAttributes/cpu/brand as cpuBrand').getItem();
            expect(item).toBeTruthy();
            expect(item.cpuBrand).toBe('Intel');
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.extraAttributes).toBeTruthy();
        });
    });

    it('should update and get unknown json attribute value (without alias)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('extraAttributes/cpu/brand').getItem();
            expect(item).toBeTruthy();
            expect(item.extraAttributes_cpu_brand).toBe('Intel');
        });
    });

    it('should update and get unknown json attribute value (with closure)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select((x: any) => {
                    return {
                        brand: x.extraAttributes.cpu.brand
                    }
                }).getItem();
            expect(item).toBeTruthy();
            expect(item.brand).toBe('Intel');
        });
    });

    it('should query and get unknown json attribute value (with closure)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .where((x: any) => {
                    return x.extraAttributes.cpu.brand === 'Intel'
                }).getItem();
            expect(item).toBeTruthy();
            expect(item.name).toBe('Apple MacBook Air (13.3-inch, 2013 Version)');
        });
    });

    it('should update and get unknown json attribute value (with closure and function)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select((x: any) => {
                    return {
                        brand: x.extraAttributes.cpu.brand.toUpperCase()
                    }
                }).getItem();
            expect(item).toBeTruthy();
            expect(item.brand).toBe('INTEL');
        });
    });

    it('should update and get unknown json object value (with closure)', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.extraAttributes = {
                cpu: {
                    brand: 'Intel',
                    model: 'Core i5'
                },
                ram: '8GB'
            }
            await Products.save(item);
            expect(item.dateCreated).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select((x: any) => {
                    return {
                        cpu: x.extraAttributes.cpu
                    }
                }).getItem();
            expect(item).toBeTruthy();
            expect(item.cpu).toStrictEqual({
                brand: 'Intel',
                model: 'Core i5'
            });
        });
    });

    it('should update json structured value', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver',
                audience: {
                    name: 'New customers',
                    description: 'New customers who have never purchased before',
                    audienceType: 'B2C',
                    geographicArea: 'Worldwide'
                }
            }
            await Products.save(item);
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.metadata).toBeTruthy();
            expect(item.metadata.audience).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('metadata/audience/name as audienceName').getItem();
            expect(item).toBeTruthy();
            expect(item.audienceName).toBe('New customers');
            item = await Products.where((x: any) => {
                return x.name === 'Apple MacBook Air (13.3-inch, 2013 Version)'
            }).select((x: any) => {
                    return {
                        audienceName: x.metadata.audience.name
                    }
                }).getItem();
            expect(item).toBeTruthy();
            expect(item.audienceName).toBe('New customers');
        });
    });

    it('should select json nested value', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver',
                audience: {
                    name: 'New customers',
                    description: 'New customers who have never purchased before',
                    audienceType: 'B2C',
                    geographicArea: 'Worldwide'
                }
            }
            await Products.save(item);
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem();
            expect(item).toBeTruthy();
            expect(item.metadata).toBeTruthy();
            expect(item.metadata.audience).toBeTruthy();
            item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)')
                .select('metadata/audience as audience').getItem();
            expect(item).toBeTruthy();
            expect(item.audience.name).toBe('New customers');
        });
    });

    it('should throw error on invalid json', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let item = await Products.where('name').equal('Apple MacBook Air (13.3-inch, 2013 Version)').getItem()
            expect(item).toBeTruthy();
            item.metadata = {
                color: 'silver',
                message : 'hello'
            }
            await expect(Products.save(item)).rejects.toThrow('The given structured value seems to be invalid. The property \'message\' is not defined in the target model.');
        });
    });

    it('should select json attribute from $select', async () => {
        const Products = context.model('Product').silent();
        const options = {
            $select: 'id,name,metadata/color as color',
            $top: 10
        }
        const q = await Products.filterAsync(options);
        const items = await q.getItems();
        expect(items).toBeTruthy();
        expect(items.length).toBeGreaterThan(0);
    });

    it('should use json attribute in aggregate functions', async () => {
        await TestUtils.executeInTransaction(context, async () => {
            const Products = context.model('Product').silent();
            let items = await Products.asQueryable().select('id', 'metadata').where('category').equal('Laptops')
                //.and('id').equal(19)
                //.take(20)
                .getItems();
            expect(items).toBeTruthy();
            const colors = ['silver', 'black', 'white', 'red', 'blue'];
            items.forEach(item => {
                item.metadata = {
                    color: colors[Math.floor(Math.random() * colors.length)]
                }
            });
            for (const item of items) {
                await Products.save(item);
            }
            items = await Products.asQueryable().select(
                'count(metadata/color) as total',
                'metadata/color as color'
            ).groupBy(
                'metadata/color'
            ).getItems();
            expect(items).toBeTruthy();
       });
    });

});
