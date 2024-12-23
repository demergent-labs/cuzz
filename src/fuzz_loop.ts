import { execSync } from 'child_process';
import * as fc from 'fast-check';
import * as util from 'node:util';

import {
    ArgumentsArbitraries,
    ArgumentsArbitrary,
    CanisterActor,
    CuzzOptions
} from './types';
import { DEFAULT_CYCLES_ERRORS } from './cuzz_options';

type State = {
    numCalls: number;
    startingMemorySize: number | null;
    startTime: number | null;
    endTime: number | null;
};

let state: State = {
    numCalls: 0,
    startingMemorySize: null,
    startTime: null,
    endTime: null
};

export async function fuzzLoop(
    cuzzOptions: CuzzOptions,
    actor: CanisterActor,
    argumentsArbitraries: ArgumentsArbitraries
): Promise<void> {
    state.numCalls = 0;
    state.startingMemorySize = getRawMemorySize(cuzzOptions.canisterName);
    state.startTime = new Date().getTime();
    state.endTime =
        cuzzOptions.timeLimit === 0
            ? null
            : state.startTime + cuzzOptions.timeLimit * 60 * 1_000;

    while (true) {
        if (state.endTime !== null && new Date().getTime() >= state.endTime) {
            if (cuzzOptions.silent === false) {
                console.info('\nTime limit reached, exiting successfully...');
            }

            process.exit(0);
        }

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
            displayStatus(cuzzOptions, methodName, methodArguments, result);
        }
    } catch (error: any) {
        handleCyclesError(cuzzOptions, error, cuzzOptions.canisterName);

        if (isExpectedError(error, cuzzOptions.expectedErrors) === false) {
            console.error('Error occurred with params:', methodArguments);
            console.error(error);
            process.exit(1);
        }

        if (cuzzOptions.silent === false) {
            displayStatus(
                cuzzOptions,
                methodName,
                methodArguments,
                `expected error: ${error.message}`
            );
        }
    }
}

function displayStatus(
    cuzzOptions: CuzzOptions,
    methodName: string,
    params: any[],
    result: any
): void {
    const currentMemorySize = getRawMemorySize(cuzzOptions.canisterName);
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

    const remainingTime =
        state.endTime !== null
            ? Math.max(
                  0,
                  (state.endTime - new Date().getTime()) / 1_000
              ).toFixed(1)
            : '∞';

    if (cuzzOptions.clearConsole === true) {
        console.clear();
    }

    console.info(`Canister: ${cuzzOptions.canisterName}`);
    console.info(`Method: ${methodName}\n`);

    console.info(`Call delay: ${cuzzOptions.callDelay}s`);
    console.info(`Time elapsed: ${elapsedTime}s`);
    console.info(
        `Time remaining: ${remainingTime}${remainingTime === '∞' ? '' : 's'}`
    );
    console.info(`Number of calls: ${state.numCalls}\n`);

    console.info(`Memory size (starting):`, startingMemorySizeFormatted);
    console.info(`Memory size (now):`, currentMemorySizeFormatted);
    console.info(
        `Memory size (increase since starting):`,
        memoryIncreaseSinceStartingFormatted,
        '\n'
    );

    console.info(
        `      params:`,
        util.inspect(params, {
            depth: 5,
            colors: true,
            maxArrayLength: 100,
            maxStringLength: 100
        })
    );
    console.info(
        `      result:`,
        util.inspect(result, {
            depth: 5,
            colors: true,
            maxArrayLength: 100,
            maxStringLength: 100
        }),
        '\n'
    );
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
    const isCyclesError = DEFAULT_CYCLES_ERRORS.some((cyclesError) =>
        error.message.includes(cyclesError)
    );

    if (isCyclesError) {
        execSync(
            `dfx ledger fabricate-cycles --canister ${canisterName} --cycles ${cuzzOptions.fabricateCycles}`
        );
    }
}

function isExpectedError(error: Error, expectedErrors: string[]): boolean {
    return expectedErrors.some((expected) => {
        const regex = new RegExp(expected);
        return regex.test(error.message) || regex.test(error.toString());
    });
}
