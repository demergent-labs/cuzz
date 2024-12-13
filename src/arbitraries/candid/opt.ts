import * as fc from 'fast-check';
import { CandidAst, CandidType, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getOptArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidAst['decs'],
    optT: CandidType
): fc.Arbitrary<unknown[] | [unknown]> {
    const innerArbitrary = getArgumentArbitrary(cuzzConfig, optT, decs);

    return fc.oneof(
        fc.constant([]),
        innerArbitrary.map((value) => [value])
    );
}
