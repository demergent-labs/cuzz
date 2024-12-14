import * as fc from 'fast-check';

import {
    getBooleanArbitrary,
    getFloat32Arbitrary,
    getFloat64Arbitrary,
    getFuncArbitrary,
    getInt16Arbitrary,
    getInt32Arbitrary,
    getInt64Arbitrary,
    getInt8Arbitrary,
    getIntArbitrary,
    getNat16Arbitrary,
    getNat32Arbitrary,
    getNat64Arbitrary,
    getNat8Arbitrary,
    getNatArbitrary,
    getOptArbitrary,
    getPrincipalArbitrary,
    getRecordArbitrary,
    getServiceArbitrary,
    getTextArbitrary,
    getVariableArbitrary,
    getVariantArbitrary,
    getVecArbitrary
} from './candid';
import {
    ArgumentsArbitraries,
    CandidAst,
    CandidDecs,
    CandidMethod,
    CandidType,
    CuzzOptions
} from '../types';

export function getArgumentArbitraries(
    cuzzOptions: CuzzOptions,
    candidAst: CandidAst,
    canisterName: string
): ArgumentsArbitraries {
    const candidMethods =
        candidAst.actor.ServT ?? candidAst.actor.ClassT?.[1].ServT;

    if (candidMethods === undefined) {
        throw new Error(`No methods found for canister ${canisterName}`);
    }

    return getArgumentArbitrariesFromCandidMethods(
        cuzzOptions,
        candidAst.decs,
        candidMethods
    );
}

function getArgumentArbitrariesFromCandidMethods(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    candidMethods: CandidMethod[]
): ArgumentsArbitraries {
    return candidMethods.reduce(
        (
            acc: ArgumentsArbitraries,
            candidMethod: CandidMethod
        ): ArgumentsArbitraries => {
            const methodName = candidMethod.id;
            const funcType = candidMethod.typ.FuncT;

            const argumentArbitraries = funcType.args.map((type) =>
                getArgumentArbitrary(cuzzOptions, decs, type)
            );

            return {
                ...acc,
                [methodName]: fc.tuple(...argumentArbitraries)
            };
        },
        {}
    );
}

export function getArgumentArbitrary(
    cuzzOptions: CuzzOptions,
    decs: CandidDecs,
    type: CandidType
): fc.Arbitrary<unknown> {
    if (type === 'PrincipalT') {
        return getPrincipalArbitrary();
    }

    if (type.PrimT === 'Bool') {
        return getBooleanArbitrary();
    }

    if (type.PrimT === 'Empty') {
        return fc.constant(undefined);
    }

    if (type.PrimT === 'Float32') {
        return getFloat32Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Float64') {
        return getFloat64Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Int') {
        return getIntArbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Int16') {
        return getInt16Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Int32') {
        return getInt32Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Int64') {
        return getInt64Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Int8') {
        return getInt8Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Nat') {
        return getNatArbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Nat16') {
        return getNat16Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Nat32') {
        return getNat32Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Nat64') {
        return getNat64Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Nat8') {
        return getNat8Arbitrary(cuzzOptions);
    }

    if (type.PrimT === 'Null') {
        return fc.constant(null);
    }

    if (type.PrimT === 'Reserved') {
        return fc.constant(undefined);
    }

    if (type.PrimT === 'Text') {
        return getTextArbitrary(cuzzOptions);
    }

    if (type.FuncT !== undefined) {
        return getFuncArbitrary(cuzzOptions);
    }

    if (type.OptT !== undefined) {
        return getOptArbitrary(cuzzOptions, decs, type.OptT);
    }

    if (type.RecordT !== undefined) {
        return getRecordArbitrary(cuzzOptions, decs, type.RecordT);
    }

    if (type.ServT !== undefined) {
        return getServiceArbitrary();
    }

    if (type.VarT !== undefined) {
        return getVariableArbitrary(cuzzOptions, decs, type.VarT);
    }

    if (type.VariantT !== undefined) {
        return getVariantArbitrary(cuzzOptions, decs, type.VariantT);
    }

    if (type.VecT !== undefined) {
        return getVecArbitrary(cuzzOptions, decs, type.VecT);
    }

    throw new Error(`Unsupported Candid type: ${JSON.stringify(type)}`);
}
