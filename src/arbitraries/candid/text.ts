import * as fc from 'fast-check';

import { CuzzConfig } from '../../types';

export function getTextArbitrary(cuzzConfig: CuzzConfig): fc.Arbitrary<string> {
    const baseArbitrary = fc.string({
        size: 'max',
        maxLength: cuzzConfig.maxLength?.text ?? 100_000
    });

    if (
        cuzzConfig.textFilter !== undefined &&
        cuzzConfig.textFilter.length > 0
    ) {
        return baseArbitrary.filter(
            (text) =>
                !cuzzConfig.textFilter?.some((word) => text.includes(word))
        );
    }

    return baseArbitrary;
}
