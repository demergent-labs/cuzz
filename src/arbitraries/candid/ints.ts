import * as fc from 'fast-check';

export function getIntArbitrary(): fc.Arbitrary<bigint> {
    return fc.bigInt();
}

export function getInt64Arbitrary(): fc.Arbitrary<bigint> {
    return fc.bigInt({
        min: -(2n ** 63n),
        max: 2n ** 63n - 1n
    });
}

export function getInt32Arbitrary(): fc.Arbitrary<number> {
    return fc.integer({
        min: -(2 ** 31),
        max: 2 ** 31 - 1
    });
}

export function getInt16Arbitrary(): fc.Arbitrary<number> {
    return fc.integer({
        min: -(2 ** 15),
        max: 2 ** 15 - 1
    });
}

export function getInt8Arbitrary(): fc.Arbitrary<number> {
    return fc.integer({
        min: -(2 ** 7),
        max: 2 ** 7 - 1
    });
}
