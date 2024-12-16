import { readFile } from 'fs/promises';
import { CuzzConfig, CuzzOptions } from './types';
import { join } from 'path';
import { OptionValues, program } from 'commander';

export const DEFAULT_CYCLES_ERRORS = [
    'is out of cycles',
    "is unable to process query calls because it's frozen"
];

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
        deployArgs?: string;
        excludeDefaultExpectedErrors?: boolean;
        port?: string;
        printDefaultExpectedErrors?: boolean;
        silent?: boolean;
        skipDeploy?: boolean;
        terminal?: boolean;
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
        callDelay: Number(cuzzConfig.callDelay ?? cliOptions.callDelay ?? 1),
        candidPath: cuzzConfig.candidPath ?? cliOptions.candidPath,
        canisterName,
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
        textFilter: cuzzConfig.textFilter ?? []
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
        .option('--terminal', 'run in new terminal window')
        .option(
            '--deploy-args <string>',
            'arguments to pass to the deploy command'
        )
        .option('--port <number>', 'ICP replica port')
        .option(
            '--exclude-default-expected-errors',
            'exclude the default expected errors'
        )
        .option(
            '--print-default-expected-errors',
            'print the default expected errors'
        );

    program.parse();

    return program.opts();
}
