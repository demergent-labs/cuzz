import { Principal } from '@dfinity/principal';
import * as fc from 'fast-check';

import { CuzzOptions } from '../../types';
import { getPrincipalArbitrary } from './principal';
import { getTextArbitrary } from './text';

export function getFuncArbitrary(
    cuzzOptions: CuzzOptions
): fc.Arbitrary<[Principal, string]> {
    return fc.tuple(getPrincipalArbitrary(), getTextArbitrary(cuzzOptions));
}
