import { Principal } from '@dfinity/principal';
import * as fc from 'fast-check';
import { CuzzConfig } from '../../types';
import { getPrincipalArbitrary } from './principal';
import { getTextArbitrary } from './text';

export function getFuncArbitrary(
    cuzzConfig: CuzzConfig
): fc.Arbitrary<[Principal, string]> {
    return fc.tuple(getPrincipalArbitrary(), getTextArbitrary(cuzzConfig));
}
