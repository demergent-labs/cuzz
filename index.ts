#!/usr/bin/env -S npx tsx

// TODO if a canister is going to be skipped, we should print that

// TODO if a canister doesn't have _azle_memory_usage, we need to deal with that situation

// TODO how will we deal with recursive types?

// TODO make sure to print the params with the errors

// TODO should it adaptively grow the input sizes?

// TODO maybe after a certain number of iterations the input sizes should increase?

// TODO when it fails it needs to display the exact inputs

// TODO allow the dev to pass in arguments to deploy
// TODO how do we deal with memory and things growing out of control?
// TODO for example the instruction limits get hit and then we just ignore them
// TODO but I feel like that might ruin the test at that point?
// TODO I guess an easy way to get around that would be to create a method
// TODO that clears the memory automatically...it would clear your database
// TODO and maybe that will help us detect memory leaks

// TODO make sure to put in a check for memory leaks
// TODO maybe we just report if memory is increasing?

// TODO I think the user should just have to give the port and the canister name or id
// TODO and then cuzz can just directly ask the replica for the Candid file
// TODO and we can compile that here and get the actor

// TODO once we get a candid string generator, we should use that for call_raw and any other test that expects candid strings

// TODO for the errors we should probably allow a regex or glob pattern

// TODO should cuzz automatically work for multiple canisters? As in if you don't specify a canister name
// TODO it will just work for all canisters and allow you to have the terminals or not?
// TODO right now we have azle test framework orchestrating this stuff

// TODO for memory leaks, maybe we log the change in memory at each step
// TODO so then you can just look at the final log and see if there was any increase in memory
// TODO I am thinking we need a way to allow the dev to clear memory...
// TODO maybe we have an option to fail on any memory increase?
// TODO or an increase beyond a certain amount?

import { program } from 'commander';
import { execSync, spawn } from 'child_process';
import { parse_candid, compile_candid } from './candid_parser_wasm/pkg';
import { Principal } from '@dfinity/principal';
import * as fs from 'fs';
import * as fc from 'fast-check';
import { Actor, HttpAgent } from '@dfinity/agent';

type CandidPrimitiveType =
    | 'Bool'
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
    | 'Int8'
    | 'Null'
    | 'Float32'
    | 'Float64'
    | 'Empty'
    | 'Reserved';

type CandidType =
    | 'PrincipalT'
    | {
          PrimT?: CandidPrimitiveType;
          VecT?: CandidType;
          VarT?: string;
          RecordT?: Array<{
              label: { Named: string } | { Unnamed: number };
              typ: CandidType;
          }>;
          VariantT?: Array<{ label: { Named: string }; typ: CandidType }>;
          ServT?: CandidMethod[];
          FuncT?: {
              modes: string[];
              args: CandidType[];
              rets: CandidType[];
          };
          OptT?: CandidType;
      };

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
    decs: Array<{
        TypD: {
            id: string;
            typ: CandidType;
        };
    }>;
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

export type CuzzConfig = {
    expectedErrors?: string[];
    callDelay?: number;
    maxLength?: {
        text?: number;
        vec?: number;
        blob?: number;
    };
    textFilter?: string[];
    skip?: boolean | string;
    nat64?: {
        min?: string;
        max?: string;
    };
    fabricateCycles?: string;
};

main();

async function main() {
    program
        .option('--canister-name <name>', `name of the canister`)
        .option('--skip-deploy', 'skip deployment and just get candid')
        .option('--silent', 'skip logging except for errors')
        .option('--candid-path <path>', 'path to candid file to read from')
        .option(
            '--call-delay <number>',
            'number of seconds between a set of calls to all canister methods',
            '1'
        )
        .option('--terminal', 'run in new terminal window');

    program.parse();

    const options = program.opts();
    const canisterName: string = options.canisterName;
    const skipDeploy: boolean = options.skipDeploy ?? false;
    const silent: boolean = options.silent ?? false;
    const candidPath: string | undefined = options.candidPath;
    const terminal: boolean = options.terminal ?? false;
    let callDelay: number = Number(options.callDelay) * 1_000;

    if (terminal === true) {
        const args = [
            process.argv[1],
            ...process.argv.slice(2).filter((arg) => arg !== '--terminal'),
            ' & exec bash'
        ];

        let cuzzProcess = spawn(
            'gnome-terminal',
            ['--', 'bash', '-c', `${args.join(' ')}`],
            {
                stdio: 'inherit'
            }
        );

        cuzzProcess.on('exit', (code) => {
            if (code !== 0) {
                process.exit(code ?? 1);
            }
        });

        return;
    }

    let cuzzConfig: CuzzConfig = {};
    try {
        cuzzConfig = JSON.parse(fs.readFileSync('cuzz.json', 'utf-8'));
        if (cuzzConfig.callDelay !== undefined) {
            callDelay = cuzzConfig.callDelay * 1_000;
        }
    } catch (error) {
        // Config file not found or invalid, continue with default config
    }

    if (cuzzConfig.skip === true || typeof cuzzConfig.skip === 'string') {
        if (typeof cuzzConfig.skip === 'string') {
            console.info(`skipping ${canisterName}: ${cuzzConfig.skip}`);
        } else {
            console.info(`skipping ${canisterName}`);
        }

        process.exit(0);
    }

    const candidService: string = candidPath
        ? fs.readFileSync(candidPath, 'utf-8')
        : !skipDeploy
        ? (execSync(`dfx deploy ${canisterName} --upgrade-unchanged`, {
              stdio: 'inherit'
          }),
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

    let numCalls = 0;
    const startTime = Date.now();

    let expectedErrors: string[] = [
        'AgentError: Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
        'Canister exceeded the limit of 5000000000 instructions for single message execution',
        'Canister exceeded the limit of 40000000000 instructions for single message execution',
        'Canister exceeded the limit of 200000000 instructions for single message execution',
        'Specified ingress_expiry not within expected range',
        '429 (Too Many Requests)',
        '413 (Payload Too Large)',
        '500 (Internal Server Error)',
        '503 (Service Unavailable)',
        'TypeError: fetch failed',
        'timed out waiting to start executing',
        'Request timed out after 300000 msec',
        'AgentError: Invalid certificate: Certificate is signed more than 5 minutes in the past'
    ];

    if (cuzzConfig.expectedErrors) {
        expectedErrors = [...expectedErrors, ...cuzzConfig.expectedErrors];
    }

    while (true) {
        for (const [methodName, methodArbitrary] of Object.entries(
            canisterMethodArbitraries
        )) {
            const sampleParams = fc.sample(methodArbitrary, 1)[0];

            async function resultAndMemoryUsage(...params: any[]) {
                numCalls++;
                return {
                    result: await actor[methodName](...params)
                };
            }

            resultAndMemoryUsage(...sampleParams)
                .then(async ({ result }) => {
                    if (silent === true) {
                        return;
                    }

                    let formattedMemoryUsage: string;
                    try {
                        const statusOutput = execSync(
                            `dfx canister status ${canisterName}`,
                            {
                                encoding: 'utf-8'
                            }
                        );
                        const memoryMatch = statusOutput.match(
                            /Memory Size: Nat\((\d+)\)/
                        );
                        formattedMemoryUsage = memoryMatch
                            ? `${Number(memoryMatch[1])
                                  .toString()
                                  .replace(/\B(?=(\d{3})+(?!\d))/g, '_')} bytes`
                            : 'unknown';
                    } catch {
                        formattedMemoryUsage = 'unknown';
                    }
                    const elapsedTime = (
                        (Date.now() - startTime) /
                        1_000
                    ).toFixed(1);

                    console.clear();
                    console.info(`Canister: ${canisterName}\n`);
                    console.info(`Time elapsed: ${elapsedTime}s\n`);
                    console.info(`number of calls: ${numCalls}\n`);
                    console.info(
                        `canister heap memory:`,
                        formattedMemoryUsage,
                        '\n'
                    );
                    console.info(`called: ${methodName}\n`);

                    console.info(`      params:`, sampleParams);
                    console.info(`      result:`, result, '\n');
                })
                .catch(async (error) => {
                    if (
                        error.message.includes('is out of cycles') ||
                        error.message.includes(
                            "is unable to process query calls because it's frozen. Please top up the canister with cycles and try again."
                        )
                    ) {
                        const cyclesToFabricate =
                            cuzzConfig.fabricateCycles ?? '100000000000000';
                        execSync(
                            `dfx ledger fabricate-cycles --canister ${canisterName} --cycles ${cyclesToFabricate}`
                        );
                        return;
                    }

                    const isExpectedError = expectedErrors.some(
                        (expectedError) =>
                            error.message.includes(expectedError) ||
                            error.toString().includes(expectedError)
                    );

                    if (!isExpectedError) {
                        console.error(
                            'Error occurred with params:',
                            sampleParams
                        );
                        console.error(error);
                        process.exit(1);
                    } else {
                        if (silent === true) {
                            return;
                        }

                        let formattedMemoryUsage: string;
                        try {
                            const statusOutput = execSync(
                                `dfx canister status ${canisterName}`,
                                {
                                    encoding: 'utf-8'
                                }
                            );
                            const memoryMatch = statusOutput.match(
                                /Memory Size: Nat\((\d+)\)/
                            );
                            formattedMemoryUsage = memoryMatch
                                ? `${Number(memoryMatch[1])
                                      .toString()
                                      .replace(
                                          /\B(?=(\d{3})+(?!\d))/g,
                                          '_'
                                      )} bytes`
                                : 'unknown';
                        } catch {
                            formattedMemoryUsage = 'unknown';
                        }
                        const elapsedTime = (
                            (Date.now() - startTime) /
                            1_000
                        ).toFixed(1);

                        console.clear();
                        console.info(`Canister: ${canisterName}\n`);
                        console.info(`Time elapsed: ${elapsedTime}s\n`);
                        console.info(`number of calls: ${numCalls}\n`);
                        console.info(
                            `canister heap memory:`,
                            formattedMemoryUsage,
                            '\n'
                        );
                        console.info(`called: ${methodName}\n`);

                        console.info(`      params:`, sampleParams);
                        console.info(`      result:`, 'expected error', '\n');
                    }
                });

            await new Promise((resolve) => setTimeout(resolve, callDelay));
        }
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

            const argsArbitraries = funcType.args.map((type) =>
                getArbitrary(type, ast.decs)
            );

            return {
                ...acc,
                [methodName]: fc.tuple(...argsArbitraries)
            };
        },
        {}
    );
}

function getArbitrary(
    type: CandidType,
    decs: CandidAst['decs']
): fc.Arbitrary<unknown> {
    let cuzzConfig: CuzzConfig = {};
    try {
        cuzzConfig = JSON.parse(fs.readFileSync('cuzz.json', 'utf-8'));
    } catch (error) {
        // Config file not found or invalid, continue with default config
    }

    if (type === 'PrincipalT') {
        return fc
            .uint8Array({
                size: 'max',
                maxLength: 29
            })
            .map((uint8Array) => Principal.fromUint8Array(uint8Array));
    }

    if (type.PrimT === 'Text') {
        const baseArbitrary = fc.string({
            size: 'max',
            maxLength: cuzzConfig.maxLength?.text ?? 100_000
        });

        if (cuzzConfig.textFilter && cuzzConfig.textFilter.length > 0) {
            return baseArbitrary.filter(
                (text) =>
                    !cuzzConfig.textFilter?.some((word) => text.includes(word))
            );
        }

        return baseArbitrary;
    }

    if (type.PrimT === 'Bool') {
        return fc.boolean();
    }

    if (type.PrimT === 'Nat') {
        return fc.bigInt({
            min: 0n,
            max: 2n ** 128n - 1n
        });
    }

    if (type.PrimT === 'Nat64') {
        return fc.bigInt({
            min: cuzzConfig.nat64?.min ? BigInt(cuzzConfig.nat64.min) : 0n,
            max: cuzzConfig.nat64?.max
                ? BigInt(cuzzConfig.nat64.max)
                : 2n ** 64n - 1n
        });
    }

    if (type.PrimT === 'Nat32') {
        return fc.nat(2 ** 32 - 1);
    }

    if (type.PrimT === 'Nat16') {
        return fc.nat(2 ** 16 - 1);
    }

    if (type.PrimT === 'Nat8') {
        return fc.nat(2 ** 8 - 1);
    }

    if (type.PrimT === 'Int') {
        return fc.bigInt();
    }

    if (type.PrimT === 'Int64') {
        return fc.bigInt({
            min: -(2n ** 63n),
            max: 2n ** 63n - 1n
        });
    }

    if (type.PrimT === 'Int32') {
        return fc.integer({
            min: -(2 ** 31),
            max: 2 ** 31 - 1
        });
    }

    if (type.PrimT === 'Int16') {
        return fc.integer({
            min: -(2 ** 15),
            max: 2 ** 15 - 1
        });
    }

    if (type.PrimT === 'Int8') {
        return fc.integer({
            min: -(2 ** 7),
            max: 2 ** 7 - 1
        });
    }

    if (type.PrimT === 'Float32') {
        return fc.float();
    }

    if (type.PrimT === 'Float64') {
        return fc.double();
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

    if (type.VecT) {
        // @ts-ignore
        if (type.VecT.PrimT === 'Nat8') {
            return fc.uint8Array({
                size: 'max',
                maxLength: cuzzConfig.maxLength?.blob ?? 2_000_000
            });
        }

        const elementArbitrary = getArbitrary(type.VecT, decs);
        return fc.array(elementArbitrary, {
            maxLength: cuzzConfig.maxLength?.vec ?? 100
        });
    }

    if (type.VarT) {
        const typeDef = decs.find((dec) => dec.TypD.id === type.VarT);
        if (!typeDef) {
            throw new Error(`Type definition not found for ${type.VarT}`);
        }
        return getArbitrary(typeDef.TypD.typ, decs);
    }

    if (type.RecordT) {
        const allUnnamed = type.RecordT.every(
            (field) => 'Unnamed' in field.label
        );

        if (allUnnamed) {
            const tupleArbitraries = type.RecordT.sort(
                (a, b) =>
                    (a.label as { Unnamed: number }).Unnamed -
                    (b.label as { Unnamed: number }).Unnamed
            ).map((field) => getArbitrary(field.typ, decs));

            return fc.tuple(...tupleArbitraries);
        }

        const recordArbitraries = type.RecordT.map((field) => ({
            key:
                'Named' in field.label
                    ? field.label.Named
                    : String((field.label as { Unnamed: number }).Unnamed),
            arbitrary: getArbitrary(field.typ, decs)
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

    if (type.VariantT) {
        const variantArbitraries = type.VariantT.map((variant) => ({
            key: variant.label.Named,
            arbitrary:
                // @ts-ignore
                variant.typ.PrimT === 'Null'
                    ? fc.constant(null)
                    : getArbitrary(variant.typ, decs)
        }));

        return fc.oneof(
            ...variantArbitraries.map(({ key, arbitrary }) =>
                arbitrary.map((value) => ({ [key]: value }))
            )
        );
    }

    if (type.OptT) {
        const innerArbitrary = getArbitrary(type.OptT, decs);
        return fc.oneof(
            fc.constant([]),
            innerArbitrary.map((value) => [value])
        );
    }

    if (type.ServT) {
        return fc
            .uint8Array({
                size: 'max',
                maxLength: 29
            })
            .map((uint8Array) => Principal.fromUint8Array(uint8Array));
    }

    if (type.FuncT) {
        return fc.tuple(
            fc
                .uint8Array({
                    size: 'max',
                    maxLength: 29
                })
                .map((uint8Array) => Principal.fromUint8Array(uint8Array)),
            fc.string({
                size: 'max',
                maxLength: cuzzConfig.maxLength?.text ?? 100_000
            })
        );
    }

    throw new Error(`unsupported type: ${JSON.stringify(type)}`);
}
