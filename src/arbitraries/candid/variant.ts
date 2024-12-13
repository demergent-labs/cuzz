import * as fc from 'fast-check';
import { CandidDecs, CandidTypeNonPrincipal, CuzzConfig } from '../../types';
import { getArgumentArbitrary } from '..';

export function getVariantArbitrary(
    cuzzConfig: CuzzConfig,
    decs: CandidDecs,
    variantT: NonNullable<CandidTypeNonPrincipal['VariantT']>
): fc.Arbitrary<Record<string, unknown | null>> {
    const variantArbitraries = variantT.map((variant) => ({
        key: variant.label.Named,
        arbitrary:
            typeof variant.typ === 'object' &&
            'PrimT' in variant.typ &&
            variant.typ.PrimT === 'Null'
                ? fc.constant(null)
                : getArgumentArbitrary(cuzzConfig, decs, variant.typ)
    }));

    return fc.oneof(
        ...variantArbitraries.map(({ key, arbitrary }) =>
            arbitrary.map((value) => ({ [key]: value }))
        )
    );
}
