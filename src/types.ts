import { ActorMethod, ActorSubclass } from '@dfinity/agent';
import * as fc from 'fast-check';

export type ArgumentsArbitraries = Record<string, ArgumentsArbitrary>;
export type ArgumentsArbitrary = fc.Arbitrary<unknown[]>;

export type CandidAst = {
    actor: {
        ClassT?: [
            any[],
            {
                ServT: CandidMethod[];
            }
        ];
        ServT?: CandidMethod[];
    };
    decs: Array<{
        TypD: {
            id: string;
            typ: CandidType;
        };
    }>;
};

export type CandidDecs = CandidAst['decs'];

type CandidFunction = {
    FuncT: {
        args: CandidType[];
        modes: string[];
        rets: CandidType[];
    };
};

export type CandidMethod = {
    id: string;
    typ: CandidFunction;
};

type CandidPrimitiveType =
    | 'Bool'
    | 'Empty'
    | 'Float32'
    | 'Float64'
    | 'Int'
    | 'Int8'
    | 'Int16'
    | 'Int32'
    | 'Int64'
    | 'Nat'
    | 'Nat8'
    | 'Nat16'
    | 'Nat32'
    | 'Nat64'
    | 'Null'
    | 'Reserved'
    | 'Text';

export type CandidType = 'PrincipalT' | CandidTypeNonPrincipal;

export type CandidTypeNonPrincipal = {
    FuncT?: {
        args: CandidType[];
        modes: string[];
        rets: CandidType[];
    };
    OptT?: CandidType;
    PrimT?: CandidPrimitiveType;
    RecordT?: Array<{
        label: { Named: string } | { Unnamed: number };
        typ: CandidType;
    }>;
    ServT?: CandidMethod[];
    VarT?: string;
    VariantT?: Array<{ label: { Named: string }; typ: CandidType }>;
    VecT?: CandidType;
};

export type CanisterActor = ActorSubclass<
    Record<string, ActorMethod<unknown[], unknown>>
>;

export type CuzzConfig = {
    callDelay?: number;
    candidPath?: string;
    canisterName?: string;
    clearConsole?: boolean;
    deployArgs?: string;
    excludeDefaultExpectedErrors?: boolean;
    expectedErrors?: string[];
    fabricateCycles?: string;
    port?: number;
    size?: {
        blob?: {
            max?: number;
            min?: number;
        };
        float32?: {
            max?: number;
            min?: number;
        };
        float64?: {
            max?: number;
            min?: number;
        };
        int?: {
            max?: string;
            min?: string;
        };
        int64?: {
            max?: string;
            min?: string;
        };
        int32?: {
            max?: number;
            min?: number;
        };
        int16?: {
            max?: number;
            min?: number;
        };
        int8?: {
            max?: number;
            min?: number;
        };
        nat?: {
            max?: string;
            min?: string;
        };
        nat64?: {
            max?: string;
            min?: string;
        };
        nat32?: {
            max?: number;
            min?: number;
        };
        nat16?: {
            max?: number;
            min?: number;
        };
        nat8?: {
            max?: number;
            min?: number;
        };
        text?: {
            max?: number;
            min?: number;
        };
        vec?: {
            max?: number;
            min?: number;
        };
    };
    silent?: boolean;
    skip?: boolean | string;
    skipDeploy?: boolean;
    terminal?: boolean;
    textFilter?: string[];
    timeLimit?: number;
};

export type CuzzOptions = {
    callDelay: number;
    candidPath?: string;
    canisterName: string;
    clearConsole: boolean;
    deployArgs?: string;
    excludeDefaultExpectedErrors: boolean;
    expectedErrors: string[];
    fabricateCycles: string;
    port: number;
    size: {
        blob: {
            max: number;
            min: number;
        };
        float32: {
            max: number;
            min: number;
        };
        float64: {
            max: number;
            min: number;
        };
        int: {
            max: bigint;
            min: bigint;
        };
        int64: {
            max: bigint;
            min: bigint;
        };
        int32: {
            max: number;
            min: number;
        };
        int16: {
            max: number;
            min: number;
        };
        int8: {
            max: number;
            min: number;
        };
        nat: {
            max: bigint;
            min: bigint;
        };
        nat64: {
            max: bigint;
            min: bigint;
        };
        nat32: {
            max: number;
            min: number;
        };
        nat16: {
            max: number;
            min: number;
        };
        nat8: {
            max: number;
            min: number;
        };
        text: {
            max: number;
            min: number;
        };
        vec: {
            max: number;
            min: number;
        };
    };
    silent: boolean;
    skip: boolean | string;
    skipDeploy: boolean;
    terminal: boolean;
    textFilter: string[];
    timeLimit: number;
};
