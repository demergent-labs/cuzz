import { execSync } from 'child_process';
import * as fc from 'fast-check';

import {
    ArgumentsArbitraries,
    ArgumentsArbitrary,
    CanisterActor,
    CuzzOptions
} from './types';

let state = {
    numCalls: 0,
    startingMemorySize: 'unknown',
    startTime: new Date().getTime()
};

export async function fuzzLoop(
    cuzzOptions: CuzzOptions,
    actor: CanisterActor,
    argumentsArbitraries: ArgumentsArbitraries
): Promise<void> {
    state.numCalls = 0;
    state.startingMemorySize = getFormattedMemoryUsage(
        cuzzOptions.canisterName
    );
    state.startTime = new Date().getTime();

    while (true) {
        for (const [methodName, argumentsArbitrary] of Object.entries(
            argumentsArbitraries
        )) {
            // Do not await this call
            fuzzMethod(cuzzOptions, methodName, argumentsArbitrary, actor);

            await new Promise((resolve) =>
                setTimeout(resolve, cuzzOptions.callDelay * 1_000)
            );
        }
    }
}

async function fuzzMethod(
    cuzzOptions: CuzzOptions,
    methodName: string,
    argumentsArbitrary: ArgumentsArbitrary,
    actor: CanisterActor
): Promise<void> {
    const methodArguments = fc.sample(argumentsArbitrary, 1)[0];

    try {
        state.numCalls++;

        const result = await actor[methodName](...methodArguments);

        if (cuzzOptions.silent === false) {
            displayStatus(
                cuzzOptions.canisterName,
                methodName,
                cuzzOptions.callDelay,
                methodArguments,
                result
            );
        }
    } catch (error: any) {
        // TODO we could declaratize this a bit more
        handleCyclesError(cuzzOptions, error, cuzzOptions.canisterName);

        if (isExpectedError(error, cuzzOptions.expectedErrors) === false) {
            console.error('Error occurred with params:', methodArguments);
            console.error(error);
            process.exit(1);
        }

        if (cuzzOptions.silent === false) {
            displayStatus(
                cuzzOptions.canisterName,
                methodName,
                cuzzOptions.callDelay,
                methodArguments,
                'expected error'
            );
        }
    }
}

// TODO let's make this more beautiful
function displayStatus(
    canisterName: string,
    methodName: string,
    callDelay: number,
    params: any[],
    result: any
): void {
    const formattedMemoryUsage = getFormattedMemoryUsage(canisterName);
    const elapsedTime = (
        (new Date().getTime() - state.startTime) /
        1_000
    ).toFixed(1);

    console.clear();
    console.info(`Canister: ${canisterName}`);
    console.info(`Method: ${methodName}\n`);
    console.info(`Call delay: ${callDelay}s`);
    console.info(`Time elapsed: ${elapsedTime}s`);
    console.info(`Number of calls: ${state.numCalls}\n`);
    console.info(`Starting memory size:`, state.startingMemorySize);
    console.info(`Current memory size:`, formattedMemoryUsage, '\n');
    // TODO I want to add the increase in memory since start
    console.info(`      params:`, params);
    console.info(`      result:`, result, '\n');
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

function handleCyclesError(
    cuzzOptions: CuzzOptions,
    error: Error,
    canisterName: string
): void {
    const isCyclesError =
        error.message.includes('is out of cycles') ||
        error.message.includes(
            "is unable to process query calls because it's frozen"
        );

    if (isCyclesError) {
        execSync(
            `dfx ledger fabricate-cycles --canister ${canisterName} --cycles ${cuzzOptions.fabricateCycles}`
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
