import * as fc from 'fast-check';

import { CuzzOptions } from '../../types';

export function getNatArbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<bigint> {
    return fc.bigInt({
        max: cuzzOptions.size.nat.max,
        min: cuzzOptions.size.nat.min
    });
}

export function getNat64Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<bigint> {
    return fc.bigInt({
        max: cuzzOptions.size.nat64.max,
        min: cuzzOptions.size.nat64.min
    });
}

export function getNat32Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.nat32.max,
        min: cuzzOptions.size.nat32.min
    });
}

export function getNat16Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.nat16.max,
        min: cuzzOptions.size.nat16.min
    });
}

export function getNat8Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.integer({
        max: cuzzOptions.size.nat8.max,
        min: cuzzOptions.size.nat8.min
    });
}
