#!/usr/bin/env -S npx tsx

// TODO: Implement canister skip logging
// TODO: Handle recursive type definitions
// TODO: Implement adaptive input size growth
// TODO: Consider input size increases after iterations
// TODO: Support deploy arguments
// TODO: Manage memory growth and instruction limits
// TODO: Add memory clearing functionality
// TODO: Implement memory leak detection
// TODO: Add memory increase reporting
// TODO: Simplify to just port and canister name/id inputs
// TODO: Integrate direct replica Candid file fetching
// TODO: Use Candid string generator for raw calls
// TODO: Support regex/glob patterns for errors
// TODO: Consider multi-canister automation
// TODO: Migrate from Azle test framework
// TODO: Track memory changes per step
// TODO: Add memory clearing option
// TODO: Implement memory increase thresholds
// TODO: Memory leak reporting with start/current/increase

import { Actor, HttpAgent } from '@dfinity/agent';
import { execSync, spawn } from 'child_process';
import { OptionValues, program } from 'commander';
import * as fc from 'fast-check';
import * as fs from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';

import { getArgumentArbitraries } from './arbitraries';
import {
    compile_candid,
    parse_candid
} from '../candid_parser_wasm/pkg/candid_parser_wasm';
import { CandidAst, CuzzConfig, CuzzOptions } from './types';

const DEFAULT_EXPECTED_ERRORS = [
    '413 (Payload Too Large)',
    '429 (Too Many Requests)',
    '500 (Internal Server Error)',
    '503 (Service Unavailable)',
    'AgentError: Invalid certificate: Certificate is signed more than 5 minutes in the past',
    'AgentError: Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
    'Canister exceeded the limit of 200000000 instructions for single message execution',
    'Canister exceeded the limit of 40000000000 instructions for single message execution',
    'Canister exceeded the limit of 5000000000 instructions for single message execution',
    'Request timed out after 300000 msec',
    'Specified ingress_expiry not within expected range',
    'timed out waiting to start executing',
    'TypeError: fetch failed'
];

process.on('uncaughtException', (error: Error) => handleUncaughtError(error));
process.on('unhandledRejection', (reason: any) => handleUncaughtError(reason));

main();

async function main(): Promise<void> {
    const cuzzOptions = await getCuzzOptions();

    const delayMs = cuzzOptions.callDelay * 1_000;

    if (cuzzOptions.terminal) {
        launchTerminal(process.argv);
        return;
    }

    const cuzzConfig = await getCuzzConfig();

    if (cuzzConfig.skip) {
        const skipMessage =
            typeof cuzzConfig.skip === 'string'
                ? `skipping ${cuzzOptions.canisterName}: ${cuzzConfig.skip}`
                : `skipping ${cuzzOptions.canisterName}`;
        console.info(skipMessage);
        process.exit(0);
    }

    const candidService = getCandidService(
        cuzzOptions.canisterName,
        cuzzOptions.skipDeploy,
        cuzzOptions.candidPath
    );
    console.log('candid:service', candidService);

    const canisterId = execSync(`dfx canister id ${cuzzOptions.canisterName}`, {
        encoding: 'utf-8'
    }).trim();
    const ast: CandidAst = parse_candid(candidService);
    console.log('ast', JSON.stringify(ast, null, 4));

    const canisterMethodArbitraries = getArgumentArbitraries(
        cuzzOptions,
        ast,
        cuzzOptions.canisterName
    );
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

    const agent = new HttpAgent({ host: 'http://localhost:8000' });
    await agent.fetchRootKey();

    const actor = Actor.createActor(idlFactory, { agent, canisterId });
    const startTime = Date.now();
    let numCalls = 0;

    const expectedErrors = [
        ...DEFAULT_EXPECTED_ERRORS,
        ...(cuzzConfig.expectedErrors ?? [])
    ];

    while (true) {
        for (const [methodName, methodArbitrary] of Object.entries(
            canisterMethodArbitraries
        )) {
            const sampleParams = fc.sample(methodArbitrary, 1)[0];

            try {
                const { result } = await executeCanisterCall(
                    actor,
                    methodName,
                    sampleParams,
                    ++numCalls
                );
                if (!cuzzOptions.silent) {
                    displayStatus(
                        cuzzOptions.canisterName,
                        startTime,
                        numCalls,
                        methodName,
                        sampleParams,
                        result
                    );
                }
            } catch (error: any) {
                await handleCyclesError(
                    error,
                    cuzzOptions.canisterName,
                    cuzzConfig
                );

                if (!isExpectedError(error, expectedErrors)) {
                    console.error('Error occurred with params:', sampleParams);
                    console.error(error);
                    process.exit(1);
                } else if (!cuzzOptions.silent) {
                    displayStatus(
                        cuzzOptions.canisterName,
                        startTime,
                        numCalls,
                        methodName,
                        sampleParams,
                        'expected error'
                    );
                }
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

function handleUncaughtError(error: Error): never {
    const prefix = 'Cuzz Error';

    console.error(`${prefix}: ${error.stack}`);

    process.exit(1);
}

// TODO should we add all of the CuzzOptions to the CLI options?
function parseCommandLineOptions(): OptionValues {
    program
        .option('--canister-name <name>', 'name of the canister')
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

    return program.opts();
}

async function getCuzzOptions(): Promise<CuzzOptions> {
    const cuzzConfig = await getCuzzConfig();

    const cliOptions: {
        callDelay?: string;
        candidPath?: string;
        canisterName?: string;
        silent?: boolean;
        skipDeploy?: boolean;
        terminal?: boolean;
    } = parseCommandLineOptions();

    const canisterName = cuzzConfig.canisterName ?? cliOptions.canisterName;

    if (canisterName === undefined) {
        throw new Error('Canister name is required');
    }

    return {
        callDelay: Number(cuzzConfig.callDelay ?? cliOptions.callDelay ?? 1),
        candidPath: cuzzConfig.candidPath ?? cliOptions.candidPath,
        canisterName,
        expectedErrors: [
            ...DEFAULT_EXPECTED_ERRORS,
            ...(cuzzConfig.expectedErrors ?? [])
        ],
        fabricateCycles: cuzzConfig.fabricateCycles ?? '100000000000000',
        size: {
            blob: {
                max: cuzzConfig.size?.blob?.max ?? 2_000_000,
                min: cuzzConfig.size?.blob?.min ?? 0
            },
            float32: {
                max: cuzzConfig.size?.float32?.max ?? 3.4e38,
                min: cuzzConfig.size?.float32?.min ?? -3.4e38
            },
            float64: {
                max: cuzzConfig.size?.float64?.max ?? 1.8e308,
                min: cuzzConfig.size?.float64?.min ?? -1.8e308
            },
            int: {
                max: cuzzConfig.size?.int?.max
                    ? BigInt(cuzzConfig.size?.int?.max)
                    : undefined,
                min: cuzzConfig.size?.int?.min
                    ? BigInt(cuzzConfig.size?.int?.min)
                    : undefined
            },
            int64: {
                max: BigInt(cuzzConfig.size?.int64?.max ?? 2n ** 63n - 1n),
                min: BigInt(cuzzConfig.size?.int64?.min ?? -(2n ** 63n))
            },
            int32: {
                max: cuzzConfig.size?.int32?.max ?? 2 ** 31 - 1,
                min: cuzzConfig.size?.int32?.min ?? -(2 ** 31)
            },
            int16: {
                max: cuzzConfig.size?.int16?.max ?? 2 ** 15 - 1,
                min: cuzzConfig.size?.int16?.min ?? -(2 ** 15)
            },
            int8: {
                max: cuzzConfig.size?.int8?.max ?? 2 ** 7 - 1,
                min: cuzzConfig.size?.int8?.min ?? -(2 ** 7)
            },
            nat: {
                max: cuzzConfig.size?.nat?.max
                    ? BigInt(cuzzConfig.size?.nat?.max)
                    : undefined,
                min: cuzzConfig.size?.nat?.min
                    ? BigInt(cuzzConfig.size?.nat?.min)
                    : undefined
            },
            nat64: {
                max: BigInt(cuzzConfig.size?.nat64?.max ?? 2n ** 64n - 1n),
                min: BigInt(cuzzConfig.size?.nat64?.min ?? 0n)
            },
            nat32: {
                max: cuzzConfig.size?.nat32?.max ?? 2 ** 32 - 1,
                min: cuzzConfig.size?.nat32?.min ?? 0
            },
            nat16: {
                max: cuzzConfig.size?.nat16?.max ?? 2 ** 16 - 1,
                min: cuzzConfig.size?.nat16?.min ?? 0
            },
            nat8: {
                max: cuzzConfig.size?.nat8?.max ?? 2 ** 8 - 1,
                min: cuzzConfig.size?.nat8?.min ?? 0
            },
            text: {
                max: cuzzConfig.size?.text?.max ?? 100_000,
                min: cuzzConfig.size?.text?.min ?? 0
            },
            vec: {
                max: cuzzConfig.size?.vec?.max ?? 100,
                min: cuzzConfig.size?.vec?.min ?? 0
            }
        },
        silent: cuzzConfig.silent ?? cliOptions.silent ?? false,
        skip: cuzzConfig.skip ?? false,
        skipDeploy: cuzzConfig.skipDeploy ?? cliOptions.skipDeploy ?? false,
        terminal: cuzzConfig.terminal ?? cliOptions.terminal ?? false,
        textFilter: cuzzConfig.textFilter ?? []
    };
}

function launchTerminal(args: string[]): void {
    const filteredArgs = args.filter((arg) => arg !== '--terminal');
    const terminalCommand = [...filteredArgs, ' & exec bash'].join(' ');

    const cuzzProcess = spawn(
        'gnome-terminal',
        ['--', 'bash', '-c', terminalCommand],
        { stdio: 'inherit' }
    );

    cuzzProcess.on('exit', (code) => {
        if (code !== 0) {
            process.exit(code ?? 1);
        }
    });
}

function getCandidService(
    canisterName: string,
    skipDeploy: boolean,
    candidPath?: string
): string {
    if (candidPath) {
        return fs.readFileSync(candidPath, 'utf-8');
    }

    if (!skipDeploy) {
        execSync(`dfx deploy ${canisterName} --upgrade-unchanged`, {
            stdio: 'inherit'
        });
    }

    return execSync(`dfx canister metadata ${canisterName} candid:service`, {
        encoding: 'utf-8'
    });
}

function getFormattedMemoryUsage(canisterName: string): string {
    try {
        const statusOutput = execSync(`dfx canister status ${canisterName}`, {
            encoding: 'utf-8'
        });
        const memoryMatch = statusOutput.match(/Memory Size: Nat\((\d+)\)/);
        return memoryMatch
            ? `${Number(memoryMatch[1])
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, '_')} bytes`
            : 'unknown';
    } catch {
        return 'unknown';
    }
}

function displayStatus(
    canisterName: string,
    startTime: number,
    numCalls: number,
    methodName: string,
    params: any[],
    result: any
): void {
    const formattedMemoryUsage = getFormattedMemoryUsage(canisterName);
    const elapsedTime = ((Date.now() - startTime) / 1_000).toFixed(1);

    console.clear();
    console.info(`Canister: ${canisterName}\n`);
    console.info(`Time elapsed: ${elapsedTime}s\n`);
    console.info(`number of calls: ${numCalls}\n`);
    console.info(`canister heap memory:`, formattedMemoryUsage, '\n');
    console.info(`called: ${methodName}\n`);
    console.info(`      params:`, params);
    console.info(`      result:`, result, '\n');
}

async function handleCyclesError(
    error: Error,
    canisterName: string,
    config: CuzzConfig
): Promise<void> {
    const isCyclesError =
        error.message.includes('is out of cycles') ||
        error.message.includes(
            "is unable to process query calls because it's frozen"
        );

    if (isCyclesError) {
        const cyclesToFabricate = config.fabricateCycles ?? '100000000000000';
        execSync(
            `dfx ledger fabricate-cycles --canister ${canisterName} --cycles ${cyclesToFabricate}`
        );
    }
}

function isExpectedError(error: Error, expectedErrors: string[]): boolean {
    return expectedErrors.some(
        (expected) =>
            error.message.includes(expected) ||
            error.toString().includes(expected)
    );
}

async function executeCanisterCall(
    actor: any,
    methodName: string,
    params: any[],
    numCalls: number
): Promise<{ result: any }> {
    return {
        result: await actor[methodName](...params)
    };
}

async function getCuzzConfig(): Promise<CuzzConfig> {
    try {
        const cuzzFile = await readFile(
            join(process.cwd(), 'cuzz.json'),
            'utf-8'
        );
        return JSON.parse(cuzzFile);
    } catch {
        return {};
    }
}

export { CuzzConfig };
