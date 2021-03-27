/**
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import {SqlFormatter} from '@themost/query';

const REGEXP_SINGLE_QUOTE = /\\'/g;
const SINGLE_QUOTE_ESCAPE = '\'\'';
const REGEXP_DOUBLE_QUOTE = /\\"/g;
const DOUBLE_QUOTE_ESCAPE = '"';
const REGEXP_SLASH = /\\\\/g;
const SLASH_ESCAPE = '\\';

/**
 *
 * @param number
 * @param length
 * @returns {string}
 */
function zeroPad(number: any, length: number) {
    number = number || 0;
    let res = number.toString();
    while (res.length < length) {
        res = '0' + res;
    }
    return res;
}

// noinspection JSUnusedGlobalSymbols
/**
 * @augments {SqlFormatter}
 */
export class TestFormatter extends SqlFormatter {

    static get NAME_FORMAT() {
        return '"$1"'
    }

    /**
     * @constructor
     */
    constructor() {
        super();
        this.settings = {
            nameFormat: TestFormatter.NAME_FORMAT,
            forceAlias: true
        };
    }

    escapeName(name: string) {
        if (typeof name === 'string')
            return name.replace(/(\w+)/ig, this.settings.nameFormat);
        return name;
    }

    /**
     * Escapes an object or a value and returns the equivalent sql value.
     * @param {*} value - A value that is going to be escaped for SQL statements
     * @param {boolean=} unquoted - An optional value that indicates whether the resulted string will be quoted or not.
     * returns {string} - The equivalent SQL string value
     */
    escape(value: any, unquoted?: boolean) {
        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }
        if (value instanceof Date) {
            return this.escapeDate(value);
        }
        let res = super.escape.bind(this)(value, unquoted);
        if (typeof value === 'string') {
            if (REGEXP_SINGLE_QUOTE.test(res))
            //escape single quote (that is already escaped)
                res = res.replace(/\\'/g, SINGLE_QUOTE_ESCAPE);
            if (REGEXP_DOUBLE_QUOTE.test(res))
            //escape double quote (that is already escaped)
                res = res.replace(/\\"/g, DOUBLE_QUOTE_ESCAPE);
            if (REGEXP_SLASH.test(res))
            //escape slash (that is already escaped)
                res = res.replace(/\\\\/g, SLASH_ESCAPE);
        }
        return res;
    }

    /**
     * @param {Date|*} val
     * @returns {string}
     */
    escapeDate(val: Date) {
        const year = val.getFullYear();
        const month = zeroPad(val.getMonth() + 1, 2);
        const day = zeroPad(val.getDate(), 2);
        const hour = zeroPad(val.getHours(), 2);
        const minute = zeroPad(val.getMinutes(), 2);
        const second = zeroPad(val.getSeconds(), 2);
        const millisecond = zeroPad(val.getMilliseconds(), 3);
        //format timezone
        const offset = val.getTimezoneOffset(),
            timezone = (offset <= 0 ? '+' : '-') + zeroPad(-Math.floor(offset / 60), 2) + ':' + zeroPad(offset % 60, 2);
        return "'" + year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + "." + millisecond + timezone + "'";
    }

    /**
     * Implements indexOf(str,substr) expression formatter.
     * @param {string} p0 The source string
     * @param {string} p1 The string to search for
     * @returns {string}
     */
    $indexof(p0: any, p1: any) {
        return `(INSTR(${this.escape(p0, false)},${this.escape(p1, false)})-1)`;
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Implements indexOf(str,substr) expression formatter.
     * @param {string} p0 The source string
     * @param {string} p1 The string to search for
     * @returns {string}
     */
    $indexOf(p0: any, p1: any) {
        return `(INSTR(${this.escape(p0, false)},${this.escape(p1, false)})-1)`;
    }

    /**
     * Implements contains(a,b) expression formatter.
     * @param {*} p0 The source string
     * @param {*} p1 The string to search for
     * @returns {string}
     */
    $text(p0: any, p1: any) {
        return `(INSTR(${this.escape(p0, false)},${this.escape(p1, false)})-1)>=0`;
    }

    /**
     * Implements simple regular expression formatter. Important Note: SQLite 3 does not provide a core sql function for regular expression matching.
     * @param {*} p0 The source string or field
     * @param {*} p1 The string to search for
     */
    $regex(p0: any, p1: any) {
        //escape expression
        let s1 = this.escape(p1, true);
        //implement starts with equivalent for LIKE T-SQL
        if (/^\^/.test(s1)) {
            s1 = s1.replace(/^\^/, '');
        } else {
            s1 = '%' + s1;
        }
        //implement ends with equivalent for LIKE T-SQL
        if (/\$$/.test(s1)) {
            s1 = s1.replace(/\$$/, '');
        } else {
            s1 += '%';
        }
        return `LIKE(\'${s1}\',${this.escape(p0, false)}) >= 1`;
    }

    /**
     * Implements concat(a,b) expression formatter.
     * @param {*} p0
     * @param {*} p1
     * @returns {string}
     */
    $concat(p0: any, p1: any) {
        return `(IFNULL(${this.escape(p0, false)},\'\') || IFNULL(${this.escape(p1, false)},\'\'))`;
    }

    /**
     * Implements substring(str,pos) expression formatter.
     * @param {String} p0 The source string
     * @param {Number} pos The starting position
     * @param {Number=} length The length of the resulted string
     * @returns {string}
     */
    $substring(p0: any, pos: number, length?: number) {
        if (length) {
            return `SUBSTR(${this.escape(p0, false)},${pos + 1},${length})`;
        }
        return `SUBSTR(${this.escape(p0, false)},${pos + 1})`;
    }

    /**
     * Implements substring(str,pos) expression formatter.
     * @param {String} p0 The source string
     * @param {Number} pos The starting position
     * @param {Number=} length The length of the resulted string
     * @returns {string}
     */
    $substr(p0: any, pos: number, length?: number) {
        if (length) {
            return `SUBSTR(${this.escape(p0, false)},${pos + 1},${length})`;
        }
        return `SUBSTR(${this.escape(p0, false)},${pos + 1})`;
    }

    /**
     * Implements length(a) expression formatter.
     * @param {*} p0
     * @returns {string}
     */
    $length(p0: any) {
        return `LENGTH(${this.escape(p0, false)})`;
    }

    $ceiling(p0: any) {
        return `CEIL(${this.escape(p0, false)})`;
    }

    $startswith(p0: any, p1: any) {
        return `LIKE('${this.escape(p1, true)}%',${this.escape(p0, false)})`;
    }

    $contains(p0: any, p1: any) {
        return `LIKE('%${this.escape(p1, true)}%',${this.escape(p0, false)})`;
    }

    $endswith(p0: any, p1: any) {
        return `LIKE('%${this.escape(p1, true)}',${this.escape(p0, false)})`;
    }

    $day(p0: any) {
        return `CAST(strftime('%d', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $dayOfMonth(p0: any) {
        return `CAST(strftime('%d', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $month(p0: any) {
        return `CAST(strftime('%m', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $year(p0: any) {
        return `CAST(strftime('%Y', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $hour(p0: any) {
        return `CAST(strftime('%H', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $minute(p0: any) {
        return `CAST(strftime('%M', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $minutes(p0: any) {
        return `CAST(strftime('%M', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $second(p0: any) {
        return `CAST(strftime('%S', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $seconds(p0: any) {
        return `CAST(strftime('%S', ${this.escape(p0, false)}) AS INTEGER)`;
    }

    $date(p0: any) {
        return `date(${this.escape(p0, false)})`;
    }
}
