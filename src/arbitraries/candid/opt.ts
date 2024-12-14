import * as fc from 'fast-check';

import { CandidDecs, CandidType, CuzzOptions } from '../../types';
import { getArgumentArbitrary } from '..';

export function getOptArbitrary(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    optT: CandidType
): fc.Arbitrary<[] | [unknown]> {
    const innerArbitrary = getArgumentArbitrary(cuzzOptions, decs, optT);

    return fc.oneof(
        fc.constant<[]>([]),
        innerArbitrary.map((value) => [value] as [unknown])
    );
}
