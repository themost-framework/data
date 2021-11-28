import { TestApplication } from './TestApplication';
import { DataContext } from '../index';
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
    it('should validate association', async ()=> {
        Object.assign(context, {
           user: {
               name: 'alexis.rees@example.com'
           } 
        });
        await TestUtils.executeInTransaction(context, async () => {
            let newOffer: any = {
                itemOffered: {
                    name: 'Samsung Galaxy S4'
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31'),
                seller: -1
            }
            await expectAsync(context.model('Offer').save(newOffer))
                .toBeRejectedWithError('An associated object cannot be found.');
            newOffer = {
                    itemOffered: {
                        name: 'Samsung Galaxy S4'
                    },
                    price: 999,
                    validFrom: new Date('2021-12-20'),
                    validThrough: new Date('2021-12-31'),
                    seller: {
                        email: 'caitlyn.barber@example.com'
                    }
                }
                await expectAsync(context.model('Offer').save(newOffer))
                .toBeResolved();
            const item = await context.model('Offer')
                .where('id').equal(newOffer.id).expand('itemOffered', 'seller').getItem();
            expect(item).toBeTruthy();
            expect(item.itemOffered).toBeTruthy();
            expect(item.seller).toBeTruthy();

            newOffer = {
                itemOffered: {
                    name: 'Samsung Galaxy S4'
                },
                price: 999,
                validFrom: new Date('2021-12-20'),
                validThrough: new Date('2021-12-31'),
                seller: null
            }
            await expectAsync(context.model('Offer').save(newOffer))
            .toBeResolved();
        });
        
        
        
    });
});