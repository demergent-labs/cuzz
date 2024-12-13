import * as fc from 'fast-check';

import { CandidAst, CandidType, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVecArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidAst['decs'],
    vecT: CandidType
): fc.Arbitrary<Array<any> | Uint8Array> {
    if (typeof vecT === 'object' && 'PrimT' in vecT && vecT.PrimT === 'Nat8') {
        return fc.uint8Array({
            size: 'max',
            maxLength: cuzzConfig.maxLength?.blob ?? 2_000_000
        });
    }

    const elementArbitrary = getArgumentArbitrary(cuzzConfig, vecT, decs);

    return fc.array(elementArbitrary, {
        maxLength: cuzzConfig.maxLength?.vec ?? 100
    });
}
