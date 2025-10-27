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
    return context.model('User').asQueryable().where((x, username) => {
        return x.name === username;
    }, name).expand((x) => x.groups).silent().getItem();
  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @param {string} name 
   * @returns {Promise<any>}
   */
  getGroup(context, name) {
    return context.model('Group').asQueryable().where((x, username) => {
        return x.name === username;
    }, name).silent().getItem();
  }

  /**
   * @param {import('@themost/common').DataContextBase} context
   * @returns {Promise<any>}
   */
  getAnonymousUser(context) {
    return context.model('User').asQueryable().where((x) => {
        return x.name === 'anonymous';
    }).expand((x) => x.groups).silent().getItem();
  }
  
}

module.exports = {
    UserService
};