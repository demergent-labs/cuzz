import * as fc from 'fast-check';

import { CandidAst, CandidType, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVariableArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidAst['decs'],
    varT: string
): fc.Arbitrary<any> {
    const typeDef = decs.find((dec) => dec.TypD.id === varT);

    if (!typeDef) {
        throw new Error(`Type definition not found for ${varT}`);
    }

    return getArgumentArbitrary(cuzzConfig, typeDef.TypD.typ, decs);
}
