import * as fc from 'fast-check';
import { CandidDecs, CandidType, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getOptArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidDecs,
    optT: CandidType
): fc.Arbitrary<[] | [unknown]> {
    const innerArbitrary = getArgumentArbitrary(cuzzConfig, decs, optT);

    return fc.oneof(
        fc.constant<[]>([]),
        innerArbitrary.map((value) => [value] as [unknown])
    );
}
