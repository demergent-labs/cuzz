import * as fc from 'fast-check';
import {
    CandidAst,
    CandidType,
    CandidTypeNonPrincipal,
    CuzzConfig
} from '../../types';
import { getArgumentArbitrary } from '..';

export function getVariantArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidAst['decs'],
    variantT: NonNullable<CandidTypeNonPrincipal['VariantT']>
): fc.Arbitrary<unknown> {
    const variantArbitraries = variantT.map((variant) => ({
        key: variant.label.Named,
        arbitrary:
            typeof variant.typ === 'object' &&
            'PrimT' in variant.typ &&
            variant.typ.PrimT === 'Null'
                ? fc.constant(null)
                : getArgumentArbitrary(cuzzConfig, variant.typ, decs)
    }));

    return fc.oneof(
        ...variantArbitraries.map(({ key, arbitrary }) =>
            arbitrary.map((value) => ({ [key]: value }))
        )
    );
}
