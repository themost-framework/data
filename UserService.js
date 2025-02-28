const { ApplicationService } = require('@themost/common');
const { BehaviorSubject, shareReplay, switchMap, from, of } = require('rxjs');

class UserService extends ApplicationService {
  constructor(app) {
    super(app);

    this.refreshAnonymousUser$ = new BehaviorSubject(void 0);
    
    this.anonymousUser$ = this.refreshAnonymousUser$.pipe(switchMap((value) => {
        if (typeof value !== 'undefined') {
            return of(value);
        }
        // create a new context
        const context = this.getApplication().createContext();
        // get anonymous user
        return from(this.getAnonymousUser(context).finally(() => {
            // finalize context
            return context.finalizeAsync();
        }));
    }), shareReplay(1));

  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @param {string} name 
   * @returns {Promise<any>}
   */
  getUser(context, name) {
    return context.model('User').where('name').equal(name).expand('groups').silent().getItem();
  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @param {string} name 
   * @returns {Promise<any>}
   */
  getGroup(context, name) {
    return context.model('Group').where('name').equal(name).silent().getItem();
  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @returns {Promise<any>}
   */
  getAnonymousUser(context) {
    return context.model('User').where('name').equal('anonymous').expand('groups').silent().getTypedItem();
  }
  
}

module.exports = {
    UserService
};