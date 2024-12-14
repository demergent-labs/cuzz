import { Principal } from '@dfinity/principal';
import * as fc from 'fast-check';

import { getPrincipalArbitrary } from './principal';

export function getServiceArbitrary(): fc.Arbitrary<Principal> {
    return getPrincipalArbitrary();
}
