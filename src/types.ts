import * as fc from 'fast-check';

export type Arbitraries = Record<string, fc.Arbitrary<unknown[]>>;

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

export type CuzzConfig = {
    callDelay?: number;
    expectedErrors?: string[];
    fabricateCycles?: string;
    maxLength?: {
        blob?: number;
        text?: number;
        vec?: number;
    };
    nat64?: {
        max?: string;
        min?: string;
    };
    skip?: boolean | string;
    textFilter?: string[];
};
