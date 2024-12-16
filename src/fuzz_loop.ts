import { execSync } from 'child_process';
import * as fc from 'fast-check';

import {
    ArgumentsArbitraries,
    ArgumentsArbitrary,
    CanisterActor,
    CuzzOptions
} from './types';

type State = {
    numCalls: number;
    startingMemorySize: number | null;
    startTime: number | null;
};

const state: State = {
    numCalls: 0,
    startingMemorySize: null,
    startTime: null
};

export async function fuzzLoop(
    cuzzOptions: CuzzOptions,
    actor: CanisterActor,
    argumentsArbitraries: ArgumentsArbitraries
): Promise<void> {
    state.numCalls = 0;
    state.startingMemorySize = getRawMemorySize(cuzzOptions.canisterName);
    state.startTime = new Date().getTime();

    while (true) {
        for (const [methodName, argumentsArbitrary] of Object.entries(
            argumentsArbitraries
        )) {
            // We must not await this call in order for the callDelay to work effectively
            fuzzMethod(cuzzOptions, methodName, argumentsArbitrary, actor);

            await new Promise((resolve) =>
                setTimeout(resolve, cuzzOptions.callDelay * 1_000)
            );
        }
    }
}

function getRawMemorySize(canisterName: string): number | null {
    try {
        const statusOutput = execSync(`dfx canister status ${canisterName}`, {
            encoding: 'utf-8'
        });
        const memoryMatch = statusOutput.match(/Memory Size: Nat\((\d+)\)/);
        return memoryMatch ? Number(memoryMatch[1]) : null;
    } catch {
        return null;
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

function displayStatus(
    canisterName: string,
    methodName: string,
    callDelay: number,
    params: any[],
    result: any
): void {
    const currentMemorySize = getRawMemorySize(canisterName);
    const currentMemorySizeFormatted = formatMemorySize(currentMemorySize);

    const startingMemorySizeFormatted = formatMemorySize(
        state.startingMemorySize
    );

    const memoryIncreaseSinceStartingFormatted =
        state.startingMemorySize !== null && currentMemorySize !== null
            ? formatMemorySize(currentMemorySize - state.startingMemorySize)
            : 'unknown';

    const elapsedTime =
        state.startTime !== null
            ? ((new Date().getTime() - state.startTime) / 1_000).toFixed(1)
            : '0.0';

    console.clear();

    console.info(`Canister: ${canisterName}`);
    console.info(`Method: ${methodName}\n`);

    console.info(`Call delay: ${callDelay}s`);
    console.info(`Time elapsed: ${elapsedTime}s`);
    console.info(`Number of calls: ${state.numCalls}\n`);

    console.info(`Memory size (starting):`, startingMemorySizeFormatted);
    console.info(`Memory size (now):`, currentMemorySizeFormatted);
    console.info(
        `Memory size (increase since starting):`,
        memoryIncreaseSinceStartingFormatted,
        '\n'
    );

    console.info(`      params:`, params);
    console.info(`      result:`, result, '\n');
}

function formatMemorySize(bytes: number | null): string {
    if (bytes === null) return 'unknown';
    return `${bytes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_')} bytes`;
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
