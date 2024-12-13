import * as fc from 'fast-check';
import { CuzzConfig } from '../../types';

export function getNatArbitrary(): fc.Arbitrary<bigint> {
    return fc.bigInt({
        min: 0n,
        max: 2n ** 128n - 1n
    });
}

export function getNat64Arbitrary(
    cuzzConfig: CuzzConfig
): fc.Arbitrary<bigint> {
    return fc.bigInt({
        min: cuzzConfig.nat64?.min ? BigInt(cuzzConfig.nat64.min) : 0n,
        max: cuzzConfig.nat64?.max
            ? BigInt(cuzzConfig.nat64.max)
            : 2n ** 64n - 1n
    });
}

export function getNat32Arbitrary(): fc.Arbitrary<number> {
    return fc.nat(2 ** 32 - 1);
}

export function getNat16Arbitrary(): fc.Arbitrary<number> {
    return fc.nat(2 ** 16 - 1);
}

export function getNat8Arbitrary(): fc.Arbitrary<number> {
    return fc.nat(2 ** 8 - 1);
}
