#!/usr/bin/env -S npx tsx

// TODO I think the user should just have to give the port and the canister name or id
// TODO and then cuzz can just directly ask the replica for the Candid file
// TODO and we can compile that here and get the actor

import { program } from 'commander';
import { execSync } from 'child_process';
import { parse_candid, compile_candid } from './candid_parser_wasm/pkg';
import { IDL } from '@dfinity/candid';
import * as fs from 'fs';
import * as fc from 'fast-check';
import { Actor, HttpAgent } from '@dfinity/agent';

type CandidPrimitiveType =
    | 'Text'
    | 'Nat'
    | 'Nat64'
    | 'Nat32'
    | 'Nat16'
    | 'Nat8'
    | 'Int'
    | 'Int64'
    | 'Int32'
    | 'Int16'
    | 'Int8';

type CandidType = { PrimT?: CandidPrimitiveType; VecT?: CandidType };

type CandidFunction = {
    FuncT: {
        modes: string[];
        args: CandidType[];
        rets: CandidType[];
    };
};

type CandidMethod = {
    id: string;
    typ: CandidFunction;
};

type CandidAst = {
    decs: any[];
    actor: {
        ClassT?: [
            any[],
            {
                ServT: CandidMethod[];
            }
        ];
        ServT?: CandidMethod[];
    };
};

main();

async function main() {
    program
        .option('--canister-name <name>', `name of the canister`)
        .option('--skip-deploy', 'skip deployment and just get candid')
        .option('--candid-path <path>', 'path to candid file to read from');

    program.parse();

    const options = program.opts();
    const canisterName: string = options.canisterName;
    const skipDeploy: boolean = options.skipDeploy ?? false;
    const candidPath: string | undefined = options.candidPath;

    const candidService: string = candidPath
        ? fs.readFileSync(candidPath, 'utf-8')
        : !skipDeploy
        ? (execSync(`dfx deploy ${canisterName}`, { stdio: 'inherit' }),
          execSync(`dfx canister metadata ${canisterName} candid:service`, {
              encoding: 'utf-8'
          }))
        : execSync(`dfx canister metadata ${canisterName} candid:service`, {
              encoding: 'utf-8'
          });

    console.log('candid:service', candidService);

    const canisterId = execSync(`dfx canister id ${canisterName}`, {
        encoding: 'utf-8'
    }).trim();

    const ast: CandidAst = parse_candid(candidService);

    console.log('ast', JSON.stringify(ast, null, 4));

    const canisterMethodArbitraries = generateArbitrary(ast);

    console.log('canisterMethodArbitraries', canisterMethodArbitraries);

    // TODO now with the canisterMethodArbitraries, we need to create a loop
    // TODO and call the methods with those random values

    const idlString = compile_candid(candidService);

    console.log('idlString', idlString);

    const normalizedIdlString = idlString
        .replace(/export const idlFactory/g, 'const idlFactory')
        .replace(/export const init/g, 'const init');

    const idlFactory = eval(`
        try {
            ${normalizedIdlString}

            idlFactory;
        }
        catch(error) {
            console.info('eval error');
            console.info(error);
        }
    `);

    console.log('idlFactory', idlFactory);

    const agent = new HttpAgent({
        host: 'http://localhost:8000'
    });

    await agent.fetchRootKey();

    const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId
    });

    for (const [methodName, methodArbitrary] of Object.entries(
        canisterMethodArbitraries
    )) {
        console.info(`calling: ${methodName}\n`);

        const sampleParams = fc.sample(methodArbitrary, 1)[0];

        console.info(`      params:`, sampleParams);

        const result = await actor[methodName](...sampleParams);

        console.info(`      result:`, result, '\n');
    }
}

function generateArbitrary(
    ast: CandidAst
): Record<string, fc.Arbitrary<unknown[]>> {
    const methods = ast.actor.ServT ?? ast.actor.ClassT?.[1].ServT;

    console.log('methods', methods);

    if (methods === undefined) {
        throw new Error('no Candid methods found');
    }

    return methods.reduce(
        (acc: Record<string, fc.Arbitrary<unknown[]>>, method) => {
            const methodName = method.id;
            const funcType = method.typ.FuncT;

            console.log('funcType', JSON.stringify(funcType, null, 4));

            const argsArbitraries = funcType.args.map(getArbitrary);

            return {
                ...acc,
                [methodName]: fc.tuple(...argsArbitraries)
            };
        },
        {}
    );
}

function getArbitrary(type: CandidType): fc.Arbitrary<unknown> {
    if (type.PrimT === 'Text') {
        return fc.string();
    }

    // if (arg.PrimT === 'Nat') {
    //     return fc.bigUint();
    // }
    // if (arg.PrimT === 'Nat64') {
    //     return fc.bigUintN(64);
    // }
    // if (arg.PrimT === 'Nat32') {
    //     return fc.nat32();
    // }
    // if (arg.PrimT === 'Nat16') {
    //     return fc.nat(65535); // 2^16 - 1
    // }
    // if (arg.PrimT === 'Nat8') {
    //     return fc.nat(255); // 2^8 - 1
    // }
    // if (arg.PrimT === 'Int') {
    //     return fc.bigInt();
    // }
    // if (arg.PrimT === 'Int64') {
    //     return fc.bigIntN(64);
    // }
    // if (arg.PrimT === 'Int32') {
    //     return fc.integer();
    // }
    // if (arg.PrimT === 'Int16') {
    //     return fc.integer(-32768, 32767); // -2^15 to 2^15-1
    // }
    // if (arg.PrimT === 'Int8') {
    //     return fc.integer(-128, 127); // -2^7 to 2^7-1
    // }
    if (type.VecT?.PrimT === 'Nat8') {
        return fc.uint8Array();
    }

    throw new Error(`unsupported type: ${type.PrimT}`);
}
