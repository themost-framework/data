import {isObjectDeep} from '../is-object';
import {Guid} from '@themost/common';

class Fruit {

}

class Apple extends Fruit {

}

class SummerFruit extends Fruit {

}

class Watermelon extends SummerFruit {

}

class PositiveNumber extends Number {
    constructor(value: any) {
        super(value);
        if (this.valueOf() <= 0) {
            throw new Error('Number should be greater than 0'); 
        }
    }
}

describe('isObjectDeep', () => {
    it('should use isObjectDeep(string)', () => {
        expect(isObjectDeep(String('test'))).toBeFalsy();
        expect(isObjectDeep('test')).toBeFalsy();
    });
    it('should use isObjectDeep(number)', () => {
        expect(isObjectDeep(Number(100))).toBeFalsy();
        expect(isObjectDeep(100)).toBeFalsy();
        expect(isObjectDeep(new PositiveNumber(100))).toBeFalsy();
    });

    it('should use isObjectDeep(Date)', () => {
        expect(isObjectDeep(new Date)).toBeFalsy();
    });

    it('should use isObjectDeep(RegExp)', () => {
        expect(isObjectDeep(new RegExp('^testing'))).toBeFalsy();
        expect(isObjectDeep(/^testing/ig)).toBeFalsy();
    });

    it('should use isObjectDeep(Array)', () => {
        expect(isObjectDeep([])).toBeFalsy();
    });

    it('should use isObjectDeep(BigInt)', () => {
        expect(isObjectDeep(BigInt(2))).toBeFalsy();
    });

    it('should use isObjectDeep(Guid)', () => {
        expect(isObjectDeep(new Guid())).toBeTruthy();
    });

    it('should use isObjectDeep(any)', () => {
        expect(isObjectDeep({
            a: 1,
            b: 2
        })).toBeTruthy();
    });

    it('should use Object.create(any)', () => {
        const obj = Object.create({
            a: 1
        });
        expect(isObjectDeep(obj)).toBeTruthy();
    });
    it('should use isObjectDeep(empty)', () => {
        expect(isObjectDeep({
        })).toBeTruthy();
    });

    it('should use isObjectDeep(null)', () => {
        expect(isObjectDeep(null)).toBeFalsy();
        expect(isObjectDeep(undefined)).toBeFalsy();
        expect(isObjectDeep(NaN)).toBeFalsy();
    });

    it('should use isObjectDeep(object)', () => {
        expect(isObjectDeep(new Fruit())).toBeTruthy();
        expect(isObjectDeep(new Apple())).toBeTruthy();
        expect(isObjectDeep(new Watermelon())).toBeTruthy();
    });
});
