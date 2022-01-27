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
        expect(isObjectDeep(new String('test'))).toBeFalse();
        expect(isObjectDeep('test')).toBeFalse();
    });
    it('should use isObjectDeep(number)', () => {
        expect(isObjectDeep(new Number(100))).toBeFalse();
        expect(isObjectDeep(100)).toBeFalse();
        expect(isObjectDeep(new PositiveNumber(100))).toBeFalse();
    });

    it('should use isObjectDeep(Date)', () => {
        expect(isObjectDeep(new Date)).toBeFalse();
    });

    it('should use isObjectDeep(RegExp)', () => {
        expect(isObjectDeep(new RegExp('^testing'))).toBeFalse();
        expect(isObjectDeep(/^testing/ig)).toBeFalse();
    });

    it('should use isObjectDeep(Array)', () => {
        expect(isObjectDeep([])).toBeFalse();
    });

    it('should use isObjectDeep(BigInt)', () => {
        expect(isObjectDeep(BigInt(2))).toBeFalse();
    });

    it('should use isObjectDeep(Guid)', () => {
        expect(isObjectDeep(new Guid())).toBeTruthy();
    });

    it('should use isObjectDeep(any)', () => {
        expect(isObjectDeep({
            a: 1,
            b: 2
        })).toBeTrue();
    });

    it('should use Object.create(any)', () => {
        const obj = Object.create({
            a: 1
        });
        expect(isObjectDeep(obj)).toBeTrue();
    });
    it('should use isObjectDeep(empty)', () => {
        expect(isObjectDeep({
        })).toBeTrue();
    });

    it('should use isObjectDeep(null)', () => {
        expect(isObjectDeep(null)).toBeFalse();
        expect(isObjectDeep(undefined)).toBeFalse();
        expect(isObjectDeep(NaN)).toBeFalse();
    });

    it('should use isObjectDeep(object)', () => {
        expect(isObjectDeep(new Fruit())).toBeTruthy();
        expect(isObjectDeep(new Apple())).toBeTruthy();
        expect(isObjectDeep(new Watermelon())).toBeTruthy();
    });
});