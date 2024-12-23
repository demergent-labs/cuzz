import { readFile } from 'fs/promises';
import { CuzzConfig, CuzzOptions } from './types';
import { join } from 'path';
import { OptionValues, program } from 'commander';

export const DEFAULT_CYCLES_ERRORS = [
    'is out of cycles',
    "is unable to process query calls because it's frozen"
];

const DEFAULT_EXPECTED_ERRORS = [
    '413 \\(Payload Too Large\\)',
    '429 \\(Too Many Requests\\)',
    '500 \\(Internal Server Error\\)',
    '503 \\(Service Unavailable\\)',
    'AgentError: Invalid certificate: Certificate is signed more than 5 minutes in the past',
    'AgentError: Timestamp failed to pass the watermark after retrying the configured 3 times. We cannot guarantee the integrity of the response since it could be a replay attack.',
    'Canister exceeded the limit of 200000000 instructions for single message execution',
    'Canister exceeded the limit of 40000000000 instructions for single message execution',
    'Canister exceeded the limit of 5000000000 instructions for single message execution',
    'Request timed out after 300000 msec',
    'Specified ingress_expiry not within expected range',
    'timed out waiting to start executing',
    'TypeError: fetch failed',
    'cannot be larger than 3145728',
    ...DEFAULT_CYCLES_ERRORS
];

export async function getCuzzOptions(): Promise<CuzzOptions> {
    const cuzzConfig = await getCuzzConfig();

    const cliOptions: {
        callDelay?: string;
        candidPath?: string;
        canisterName?: string;
        clearConsole?: boolean;
        deployArgs?: string;
        excludeDefaultExpectedErrors?: boolean;
        port?: string;
        printDefaultExpectedErrors?: boolean;
        silent?: boolean;
        skipDeploy?: boolean;
        terminal?: boolean;
        timeLimit?: string;
    } = parseCommandLineOptions();

    if (cliOptions.printDefaultExpectedErrors === true) {
        console.info('Default expected errors:');
        DEFAULT_EXPECTED_ERRORS.forEach((error) => console.info(`- ${error}`));
        process.exit(0);
    }

    const canisterName = cuzzConfig.canisterName ?? cliOptions.canisterName;

    if (canisterName === undefined) {
        throw new Error('Canister name is required');
    }

    const excludeDefaultExpectedErrors =
        cuzzConfig.excludeDefaultExpectedErrors ??
        cliOptions.excludeDefaultExpectedErrors ??
        false;

    return {
        callDelay: Number(cuzzConfig.callDelay ?? cliOptions.callDelay ?? 0.1),
        candidPath: cuzzConfig.candidPath ?? cliOptions.candidPath,
        canisterName,
        clearConsole:
            cuzzConfig.clearConsole ?? cliOptions.clearConsole ?? false,
        deployArgs: cuzzConfig.deployArgs ?? cliOptions.deployArgs,
        expectedErrors: [
            ...(excludeDefaultExpectedErrors === false
                ? DEFAULT_EXPECTED_ERRORS
                : []),
            ...(cuzzConfig.expectedErrors ?? [])
        ],
        fabricateCycles: cuzzConfig.fabricateCycles ?? '100000000000000',
        excludeDefaultExpectedErrors,
        port: Number(cuzzConfig.port ?? cliOptions.port ?? 8_000),
        size: {
            blob: {
                max: cuzzConfig.size?.blob?.max ?? 2_000_000,
                min: cuzzConfig.size?.blob?.min ?? 0
            },
            float32: {
                max: cuzzConfig.size?.float32?.max ?? Infinity,
                min: cuzzConfig.size?.float32?.min ?? -Infinity
            },
            float64: {
                max: cuzzConfig.size?.float64?.max ?? Infinity,
                min: cuzzConfig.size?.float64?.min ?? -Infinity
            },
            int: {
                max: BigInt(cuzzConfig.size?.int?.max ?? 2n ** 127n - 1n),
                min: BigInt(cuzzConfig.size?.int?.min ?? -(2n ** 127n))
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
                max: BigInt(cuzzConfig.size?.nat?.max ?? 2n ** 128n - 1n),
                min: BigInt(cuzzConfig.size?.nat?.min ?? 0n)
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
        textFilter: cuzzConfig.textFilter ?? [],
        timeLimit: Number(cuzzConfig.timeLimit ?? cliOptions.timeLimit ?? 0)
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

function parseCommandLineOptions(): OptionValues {
    program
        .requiredOption(
            '--canister-name <name>',
            '(Required) Name of the canister to fuzz test'
        )
        .option(
            '--call-delay <number>',
            'Number of seconds (can have decimals) between each canister method fuzz test call; defaults to 0.1 seconds'
        )
        .option(
            '--time-limit <number>',
            'Time limit in minutes (0 means infinite); defaults to infinite'
        )
        .option(
            '--clear-console',
            'Clear the console between method calls for a nicer UX, especially useful for real-time memory leak observation'
        )
        .option(
            '--candid-path <path>',
            'Explicitly provide the path to a candid file, instead of relying automatically on the custom candid:service metadata'
        )
        .option(
            '--skip-deploy',
            'Skip deployment of the canister (canister must already be deployed)'
        )
        .option(
            '--deploy-args <string>',
            'Candid arguments to pass to the deploy command if the canister has init parameters (same as dfx deploy --argument, but must use single outer quotes)'
        )
        .option('--silent', 'Skip logging except for errors')
        .option(
            '--terminal',
            'Run the fuzz tests in a new terminal, useful for instrumenting cuzz across multiple canisters'
        )
        .option(
            '--port <number>',
            'Port of the ICP replica to connect to; defaults to 8000'
        )
        .option(
            '--print-default-expected-errors',
            'Print the default expected errors'
        )
        .option(
            '--exclude-default-expected-errors',
            'Exclude the default expected errors'
        );

    program.parse();

    return program.opts();
}
