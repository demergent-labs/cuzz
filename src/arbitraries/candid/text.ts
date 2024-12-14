import * as fc from 'fast-check';

import { CuzzOptions } from '../../types';

export function getTextArbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<string> {
    const baseArbitrary = fc.string({
        size: 'max',
        maxLength: cuzzOptions.size.text.max,
        minLength: cuzzOptions.size.text.min
    });

    return baseArbitrary.filter(
        (text) => !cuzzOptions.textFilter.some((word) => text.includes(word))
    );
}
