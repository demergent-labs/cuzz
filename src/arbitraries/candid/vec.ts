import * as fc from 'fast-check';

import { CandidDecs, CandidType, CuzzOptions } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVecArbitrary(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    vecT: CandidType
): fc.Arbitrary<Array<any> | Uint8Array> {
    if (typeof vecT === 'object' && 'PrimT' in vecT && vecT.PrimT === 'Nat8') {
        return fc.uint8Array({
            size: 'max',
            maxLength: cuzzOptions.size.blob.max,
            minLength: cuzzOptions.size.blob.min
        });
    }

    const elementArbitrary = getArgumentArbitrary(cuzzOptions, decs, vecT);

    return fc.array(elementArbitrary, {
        maxLength: cuzzOptions.size.vec.max,
        minLength: cuzzOptions.size.vec.min
    });
}
