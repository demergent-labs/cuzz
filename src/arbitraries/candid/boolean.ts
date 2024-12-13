import * as fc from 'fast-check';

export function getBooleanArbitrary(): fc.Arbitrary<boolean> {
    return fc.boolean();
}
