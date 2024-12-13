import { Principal } from '@dfinity/principal';
import * as fc from 'fast-check';

export function getPrincipalArbitrary(): fc.Arbitrary<Principal> {
    return fc
        .uint8Array({
            size: 'max',
            maxLength: 29
        })
        .map((uint8Array) => Principal.fromUint8Array(uint8Array));
}
