import * as fc from 'fast-check';

import { CandidDecs, CandidTypeNonPrincipal, CuzzOptions } from '../../types';
import { getArgumentArbitrary } from '..';

export function getRecordArbitrary(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    recordT: NonNullable<CandidTypeNonPrincipal['RecordT']>
): fc.Arbitrary<Record<string, unknown> | unknown[]> {
    const allUnnamed = recordT.every((field) => 'Unnamed' in field.label);

    if (allUnnamed === true) {
        const tupleArbitraries = recordT
            .sort(
                (a, b) =>
                    (a.label as { Unnamed: number }).Unnamed -
                    (b.label as { Unnamed: number }).Unnamed
            )
            .map((field) => getArgumentArbitrary(cuzzOptions, decs, field.typ));

        return fc.tuple(...tupleArbitraries);
    }

    const recordArbitraries = recordT.map((field) => ({
        key:
            'Named' in field.label
                ? field.label.Named
                : String((field.label as { Unnamed: number }).Unnamed),
        arbitrary: getArgumentArbitrary(cuzzOptions, decs, field.typ)
    }));

    return fc.record(
        recordArbitraries.reduce(
            (acc, { key, arbitrary }) => ({
                ...acc,
                [key]: arbitrary
            }),
            {}
        )
    );
}
