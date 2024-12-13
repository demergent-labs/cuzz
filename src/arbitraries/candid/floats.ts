import * as fc from 'fast-check';

export function getFloat32Arbitrary(): fc.Arbitrary<number> {
    return fc.float();
}

export function getFloat64Arbitrary(): fc.Arbitrary<number> {
    return fc.double();
}
