import * as fc from 'fast-check';

import { CuzzOptions } from '../../types';

export function getFloat32Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.float({
        max: cuzzOptions.size.float32.max,
        min: cuzzOptions.size.float32.min
    });
}

export function getFloat64Arbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<number> {
    return fc.double({
        max: cuzzOptions.size.float64.max,
        min: cuzzOptions.size.float64.min
    });
}
