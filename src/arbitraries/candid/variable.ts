import * as fc from 'fast-check';

import { CandidDecs, CuzzOptions } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVariableArbitrary(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    varT: string
): fc.Arbitrary<any> {
    const typeDef = decs.find((dec) => dec.TypD.id === varT);

    if (!typeDef) {
        throw new Error(`Type definition not found for ${varT}`);
    }

    return getArgumentArbitrary(cuzzOptions, decs, typeDef.TypD.typ);
}
