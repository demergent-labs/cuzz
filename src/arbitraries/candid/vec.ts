import * as fc from 'fast-check';

import { CandidDecs, CandidType, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVecArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidDecs,
    vecT: CandidType
): fc.Arbitrary<Array<any> | Uint8Array> {
    if (typeof vecT === 'object' && 'PrimT' in vecT && vecT.PrimT === 'Nat8') {
        return fc.uint8Array({
            size: 'max',
            maxLength: cuzzConfig.maxLength?.blob ?? 2_000_000
        });
    }

    const elementArbitrary = getArgumentArbitrary(cuzzConfig, decs, vecT);

    return fc.array(elementArbitrary, {
        maxLength: cuzzConfig.maxLength?.vec ?? 100
    });
}
