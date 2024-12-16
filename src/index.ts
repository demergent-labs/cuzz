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
import { readFile } from 'fs/promises';

import './global_errors';

import { getArgumentArbitraries } from './arbitraries';
import {
    compile_candid as compileCandid,
    parse_candid as parseCandid
} from '../candid_parser_wasm/pkg/candid_parser_wasm';
import { getCuzzOptions } from './cuzz_options';
import { fuzzLoop } from './fuzz_loop';
import { CandidAst, CanisterActor, CuzzConfig, CuzzOptions } from './types';

main();

async function main(): Promise<void> {
    const cuzzOptions = await getCuzzOptions();

    if (cuzzOptions.skip === true || typeof cuzzOptions.skip === 'string') {
        console.info(getSkipMessage(cuzzOptions));
        process.exit(0);
    }

    if (cuzzOptions.terminal === true) {
        launchTerminal();
        return;
    }

    if (cuzzOptions.skipDeploy === false) {
        deploy(cuzzOptions.canisterName);
    }

    const candidService = await getCandidService(
        cuzzOptions.canisterName,
        cuzzOptions.candidPath
    );

    const candidAst: CandidAst = parseCandid(candidService);
    const argumentArbitraries = getArgumentArbitraries(
        cuzzOptions,
        candidAst,
        cuzzOptions.canisterName
    );

    const actor = await getActor(cuzzOptions, candidService);

    await fuzzLoop(cuzzOptions, actor, argumentArbitraries);
}

function getSkipMessage(cuzzOptions: CuzzOptions): string {
    return typeof cuzzOptions.skip === 'string'
        ? `skipping ${cuzzOptions.canisterName}: ${cuzzOptions.skip}`
        : `skipping ${cuzzOptions.canisterName}`;
}

// TODO the terminal isn't working
function launchTerminal(): void {
    const args = [
        process.argv[1],
        ...process.argv.slice(2).filter((arg) => arg !== '--terminal'),
        ' & exec bash' // TODO do we need this?
    ];

    let cuzzProcess = spawn(
        'gnome-terminal',
        ['--', 'bash', '-c', `${args.join(' ')}`],
        { stdio: 'inherit' }
    );

    cuzzProcess.on('exit', (code) => {
        if (code !== 0) {
            process.exit(code ?? 1);
        }
    });
}

// TODO should we allow command line args? Or is the dfx.json args ability enough?
function deploy(canisterName: string): void {
    execSync(`dfx deploy ${canisterName} --upgrade-unchanged`, {
        stdio: 'inherit'
    });
}

async function getCandidService(
    canisterName: string,
    candidPath?: string
): Promise<string> {
    if (candidPath !== undefined) {
        return await readFile(candidPath, 'utf-8');
    }

    return execSync(`dfx canister metadata ${canisterName} candid:service`, {
        encoding: 'utf-8'
    });
}

async function getActor(
    cuzzOptions: CuzzOptions,
    candidService: string
): Promise<CanisterActor> {
    const idlString = compileCandid(candidService);

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

    const agent = await HttpAgent.create({
        host: `http://localhost:${cuzzOptions.port}`,
        shouldFetchRootKey: true
    });

    const canisterId = getCanisterId(cuzzOptions.canisterName);

    const actor = Actor.createActor(idlFactory, { agent, canisterId });

    return actor;
}

function getCanisterId(canisterName: string): string {
    return execSync(`dfx canister id ${canisterName}`, {
        encoding: 'utf-8'
    }).trim();
}

export { CuzzConfig };