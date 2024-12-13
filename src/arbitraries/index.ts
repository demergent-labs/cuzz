import * as fc from 'fast-check';

import {
    getBooleanArbitrary,
    getPrincipalArbitrary,
    getTextArbitrary,
    getNatArbitrary,
    getNat64Arbitrary,
    getNat32Arbitrary,
    getNat16Arbitrary,
    getNat8Arbitrary,
    getIntArbitrary,
    getInt64Arbitrary,
    getInt32Arbitrary,
    getInt16Arbitrary,
    getInt8Arbitrary,
    getFloat32Arbitrary,
    getFloat64Arbitrary,
    getVecArbitrary,
    getVariableArbitrary,
    getRecordArbitrary,
    getVariantArbitrary,
    getOptArbitrary,
    getServiceArbitrary,
    getFuncArbitrary
} from './candid';
import {
    Arbitraries,
    CandidAst,
    CandidMethod,
    CandidType,
    CuzzConfig
} from '../types';

export function getArgumentArbitraries(
    cuzzConfig: CuzzConfig,
    ast: CandidAst,
    canisterName: string
): Arbitraries {
    const candidMethods = ast.actor.ServT ?? ast.actor.ClassT?.[1].ServT;

    if (candidMethods === undefined) {
        throw new Error(`No methods found for canister ${canisterName}`);
    }

    return getArgumentArbitrariesFromCandidMethods(
        cuzzConfig,
        ast.decs,
        candidMethods
    );
}

function getArgumentArbitrariesFromCandidMethods(
    cuzzConfig: CuzzConfig,
    decs: CandidAst['decs'],
    candidMethods: CandidMethod[]
): Arbitraries {
    return candidMethods.reduce((acc: Arbitraries, candidMethod) => {
        const methodName = candidMethod.id;
        const funcType = candidMethod.typ.FuncT;

        const argumentArbitraries = funcType.args.map((type) =>
            getArgumentArbitrary(cuzzConfig, type, decs)
        );

        return {
            ...acc,
            [methodName]: fc.tuple(...argumentArbitraries)
        };
    }, {});
}

export function getArgumentArbitrary(
    cuzzConfig: CuzzConfig,
    type: CandidType,
    decs: CandidAst['decs']
): fc.Arbitrary<unknown> {
    if (type === 'PrincipalT') {
        return getPrincipalArbitrary();
    }

    if (type.PrimT === 'Text') {
        return getTextArbitrary(cuzzConfig);
    }

    if (type.PrimT === 'Bool') {
        return getBooleanArbitrary();
    }

    if (type.PrimT === 'Nat') {
        return getNatArbitrary();
    }

    if (type.PrimT === 'Nat64') {
        return getNat64Arbitrary(cuzzConfig);
    }

    if (type.PrimT === 'Nat32') {
        return getNat32Arbitrary();
    }

    if (type.PrimT === 'Nat16') {
        return getNat16Arbitrary();
    }

    if (type.PrimT === 'Nat8') {
        return getNat8Arbitrary();
    }

    if (type.PrimT === 'Int') {
        return getIntArbitrary();
    }

    if (type.PrimT === 'Int64') {
        return getInt64Arbitrary();
    }

    if (type.PrimT === 'Int32') {
        return getInt32Arbitrary();
    }

    if (type.PrimT === 'Int16') {
        return getInt16Arbitrary();
    }

    if (type.PrimT === 'Int8') {
        return getInt8Arbitrary();
    }

    if (type.PrimT === 'Float32') {
        return getFloat32Arbitrary();
    }

    if (type.PrimT === 'Float64') {
        return getFloat64Arbitrary();
    }

    if (type.PrimT === 'Null') {
        return fc.constant(null);
    }

    if (type.PrimT === 'Empty') {
        return fc.constant(undefined);
    }

    if (type.PrimT === 'Reserved') {
        return fc.constant(undefined);
    }

    if (type.VecT !== undefined) {
        return getVecArbitrary(cuzzConfig, decs, type.VecT);
    }

    if (type.VarT !== undefined) {
        return getVariableArbitrary(cuzzConfig, decs, type.VarT);
    }

    if (type.RecordT !== undefined) {
        return getRecordArbitrary(cuzzConfig, decs, type.RecordT);
    }

    if (type.VariantT !== undefined) {
        return getVariantArbitrary(cuzzConfig, decs, type.VariantT);
    }

    if (type.OptT !== undefined) {
        return getOptArbitrary(cuzzConfig, decs, type.OptT);
    }

    if (type.ServT !== undefined) {
        return getServiceArbitrary();
    }

    if (type.FuncT !== undefined) {
        return getFuncArbitrary(cuzzConfig);
    }

    throw new Error(`Unsupported Candid type: ${JSON.stringify(type)}`);
}
