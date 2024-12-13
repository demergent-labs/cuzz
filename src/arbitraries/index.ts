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
    Arbitraries,
    CandidAst,
    CandidDecs,
    CandidMethod,
    CandidType,
    CuzzConfig
} from '../types';

export function getArgumentArbitraries(
    cuzzConfig: CuzzConfig,
    candidAst: CandidAst,
    canisterName: string
): Arbitraries {
    const candidMethods =
        candidAst.actor.ServT ?? candidAst.actor.ClassT?.[1].ServT;

    if (candidMethods === undefined) {
        throw new Error(`No methods found for canister ${canisterName}`);
    }

    return getArgumentArbitrariesFromCandidMethods(
        cuzzConfig,
        candidAst.decs,
        candidMethods
    );
}

function getArgumentArbitrariesFromCandidMethods(
    cuzzConfig: CuzzConfig,
    decs: CandidDecs,
    candidMethods: CandidMethod[]
): Arbitraries {
    return candidMethods.reduce(
        (acc: Arbitraries, candidMethod: CandidMethod): Arbitraries => {
            const methodName = candidMethod.id;
            const funcType = candidMethod.typ.FuncT;

            const argumentArbitraries = funcType.args.map((type) =>
                getArgumentArbitrary(cuzzConfig, decs, type)
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
    cuzzConfig: CuzzConfig,
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
        return getFloat32Arbitrary();
    }

    if (type.PrimT === 'Float64') {
        return getFloat64Arbitrary();
    }

    if (type.PrimT === 'Int') {
        return getIntArbitrary();
    }

    if (type.PrimT === 'Int16') {
        return getInt16Arbitrary();
    }

    if (type.PrimT === 'Int32') {
        return getInt32Arbitrary();
    }

    if (type.PrimT === 'Int64') {
        return getInt64Arbitrary();
    }

    if (type.PrimT === 'Int8') {
        return getInt8Arbitrary();
    }

    if (type.PrimT === 'Nat') {
        return getNatArbitrary();
    }

    if (type.PrimT === 'Nat16') {
        return getNat16Arbitrary();
    }

    if (type.PrimT === 'Nat32') {
        return getNat32Arbitrary();
    }

    if (type.PrimT === 'Nat64') {
        return getNat64Arbitrary(cuzzConfig);
    }

    if (type.PrimT === 'Nat8') {
        return getNat8Arbitrary();
    }

    if (type.PrimT === 'Null') {
        return fc.constant(null);
    }

    if (type.PrimT === 'Reserved') {
        return fc.constant(undefined);
    }

    if (type.PrimT === 'Text') {
        return getTextArbitrary(cuzzConfig);
    }

    if (type.FuncT !== undefined) {
        return getFuncArbitrary(cuzzConfig);
    }

    if (type.OptT !== undefined) {
        return getOptArbitrary(cuzzConfig, decs, type.OptT);
    }

    if (type.RecordT !== undefined) {
        return getRecordArbitrary(cuzzConfig, decs, type.RecordT);
    }

    if (type.ServT !== undefined) {
        return getServiceArbitrary();
    }

    if (type.VarT !== undefined) {
        return getVariableArbitrary(cuzzConfig, decs, type.VarT);
    }

    if (type.VariantT !== undefined) {
        return getVariantArbitrary(cuzzConfig, decs, type.VariantT);
    }

    if (type.VecT !== undefined) {
        return getVecArbitrary(cuzzConfig, decs, type.VecT);
    }

    throw new Error(`Unsupported Candid type: ${JSON.stringify(type)}`);
}
