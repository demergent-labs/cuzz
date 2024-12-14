import * as fc from 'fast-check';

import { CuzzOptions } from '../../types';

export function getIntArbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<bigint> {
    return fc.bigInt({
        max: cuzzOptions.size.int.max,
        min: cuzzOptions.size.int.min
    });
}

export function getInt64Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<bigint> {
    return fc.bigInt({
        max: cuzzOptions.size.int64.max,
        min: cuzzOptions.size.int64.min
    });
}

export function getInt32Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.int32.max,
        min: cuzzOptions.size.int32.min
    });
}

export function getInt16Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.int16.max,
        min: cuzzOptions.size.int16.min
    });
}

export function getInt8Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.int8.max,
        min: cuzzOptions.size.int8.min
    });
}
