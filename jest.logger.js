const { TraceUtils } = require('@themost/common');
const moment = require('moment');
const {inspect} = require('util');

class JestLogger {

    /**
     * @param {{dateFormat:string=,logLevel:string=,format:raw=}=} options
     */
    constructor(options) {
        this.options = Object.assign({}, {
            dateFormat: 'DD/MMM/YYYY:HH:mm:ss Z',
            logLevel: 'info',
            format: 'raw'
        }, options);
        if (options == null) {
            // validate NODE_ENV environment variable
            if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
                this.options.logLevel = 'debug';
            }
        }
        this.level = JestLogger.Levels.info;
        if (Object.prototype.hasOwnProperty.call(JestLogger.Levels), this.options.logLevel) {
            this.level = JestLogger.Levels[this.options.logLevel];
        }

    }

    static get Levels() {
        return {
            error: 0,
            warn: 1,
            info: 2,
            verbose: 3,
            debug: 4
        };
    }

    log() {
        if (this.level < JestLogger.Levels.info) {
            return;
        }
        this.write.apply(this, ['log'].concat(Array.from(arguments)));
    }

    info() {
        if (this.level < JestLogger.Levels.info) {
            return;
        }
        this.write.apply(this, ['info'].concat(Array.from(arguments)));
    }

    warn() {
        if (this.level < JestLogger.Levels.warn) {
            return;
        }
        this.write.apply(this, ['warn'].concat(Array.from(arguments)));
    }

    error() {
        if (this.level < JestLogger.Levels.error) {
            return;
        }
        this.write.apply(this, ['error'].concat(Array.from(arguments)));
    }

    verbose() {
        if (this.level < JestLogger.Levels.verbose) {
            return;
        }
        this.write.apply(this, ['verbose'].concat(Array.from(arguments)));
    }

    debug() {
        if (this.level < JestLogger.Levels.debug) {
            return;
        }
        this.write.apply(this, ['debug'].concat(Array.from(arguments)));
    }

    /**
     * @param {string} level
     * @param {...*} arg
     */
    // eslint-disable-next-line no-unused-vars
    write(level, arg) {
        const args = Array.from(arguments);
        const log = (level === 'error') ? process.stderr : process.stdout
        if (args.length > 1) {
            if (args[args.length - 1] == null) {
                args.pop();
            }
        }
        // add timestamp
        args.unshift(moment().format(this.options.dateFormat || 'DD/MMM/YYYY:HH:mm:ss Z'));
        log.write(args.map((arg) => inspect(arg)).map(
            (arg) => arg.replace(/^'/, '').replace(/'$/, '')
        ).join(',') + '\n');
    }
}
// use JestLogger as default logger

module.exports = JestLogger;
