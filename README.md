# cuzz

`cuzz` is a simple automatic black-box generational fuzzer for locally-deployed [Internet Computer Protocol (ICP)](https://internetcomputer.org/) canisters.

It is designed to help discover memory leaks and unexpected traps, crashes, or other similar error conditions. Simply point the `cuzz` command-line interface at a local canister and it will generate random arguments to that canister's methods in a configurable loop.

-   [Prerequisites](#prerequisites)
-   [Installation](#installation)
-   [Basic usage](#basic-usage)
    -   [ICP replica](#icp-replica)
    -   [Help](#help)
    -   [Basic fuzzing](#basic-fuzzing)
    -   [Skip deployment](#skip-deployment)
    -   [Clear the console](#clear-the-console)
    -   [Call delay](#call-delay)
    -   [Time limit](#time-limit)
    -   [Cycles](#cycles)
-   [Traps, crashes, or other similar error conditions](#traps-crashes-or-other-similar-error-conditions)
-   [Memory leaks](#memory-leaks)
-   [CLI options](#cli-options)
-   [cuzz.json](#cuzzjson)

## Prerequisites

-   dfx
-   node and npm

## Installation

```bash
npm install -g cuzz
```

## Basic usage

### ICP replica

Before using `cuzz` you should start up an ICP replica using a `dfx` command such as the following:

```bash
dfx start --host 127.0.0.1:8000
```

### Help

To quickly become familiar with the `cuzz` command-line interface, you can run the following command:

```bash
cuzz --help
```

### Basic fuzzing

The simplest way to get started is to call the `cuzz` command-line interface with the name of your canister. `cuzz` must be run in the same directory as your canister's `dfx.json` file:

```bash
cuzz --canister-name my_very_own_canister
```

The above command will automatically deploy the named canister and begin the fuzz tests.

### Skip deployment

If you have already deployed your canister and just want to run the fuzz tests right away:

```bash
cuzz --canister-name my_very_own_canister --skip-deploy
```

### Clear the console

For a nicer terminal UX, you can configure `cuzz` to clear the console between each call using the `--clear-console` option:

```bash
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console
```

### Call delay

You can configure the number of seconds between each call to the canister's methods using the `--call-delay` option. The default is `0.1` seconds:

```bash
# wait 1 second between each call
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --call-delay 1
```

```bash
# wait 0.1 seconds between each call
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --call-delay 0.1
```

```bash
# wait 0 seconds between each call (most intense single-process fuzzing)
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --call-delay 0
```

### Time limit

By default `cuzz` will fuzz indefinitely. You can configure a time limit in minutes using the `--time-limit` option:

```bash
# fuzz for 30 seconds
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --time-limit 0.5
```

```bash
# fuzz for 30 minutes
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --time-limit 30
```

```bash
# fuzz for 5 hours
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --time-limit 300
```

### Cycles

`cuzz` will automatically fabricate cycles to a canister when it encounters an error due to lack of cycles. You can configure the amount of cycles to fabricate using the `fabricateCycles` property in your `cuzz.json` file:

```json
{
    "fabricateCycles": "100000000000000"
}
```

## Traps, crashes, or other similar error conditions

To find traps, crashes, or other similar error conditions, run `cuzz` until its process ends in an unexpected way. Due to the nature of the randomly generated arguments, you will want to filter out expected errors using the `expectedErrors` property in your [`cuzz.json` file](#cuzzjson):

```json
{
    "expectedErrors": ["regex to match against the expected error message"]
}
```

### Default expected errors

`cuzz` comes with a default set of expected errors that are common in ICP canisters. If you would like to see what these errors are, you can print them using the `--print-default-expected-errors` option:

```bash
cuzz --print-default-expected-errors
```

You can also exclude these errors using the `--exclude-default-expected-errors` option:

```bash
cuzz --canister-name my_very_own_canister --skip-deploy --clear-console --exclude-default-expected-errors
```

## Memory leaks

To find memory leaks, run `cuzz` until its process either ends from a canister crashing due to running out of memory, or until you see an unexpected increase in memory size. `cuzz` will print out the starting, current, and increase in memory size in bytes.

## CLI options

| Option                              | Description                                                                                                                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--canister-name <name>`            | (Required) Name of the canister to fuzz test                                                                                                         |
| `--call-delay <number>`             | Number of seconds (can have decimals) between each canister method fuzz test call. Defaults to 0.1 seconds                                           |
| `--time-limit <number>`             | Time limit in minutes (0 means infinite). Defaults to infinite                                                                                       |
| `--clear-console`                   | Clear the console between method calls for a nicer UX, especially useful for real-time memory leak observation                                       |
| `--candid-path <path>`              | Explicitly provide the path to a candid file, instead of relying automatically on the custom candid:service metadata                                 |
| `--skip-deploy`                     | Skip deployment of the canister (canister must already be deployed)                                                                                  |
| `--deploy-args <string>`            | Candid arguments to pass to the deploy command if the canister has init parameters (same as dfx deploy --argument, but must use single outer quotes) |
| `--silent`                          | Skip logging except for errors                                                                                                                       |
| `--terminal`                        | Run the fuzz tests in a new terminal, useful for instrumenting cuzz across multiple canisters                                                        |
| `--port <number>`                   | Port of the ICP replica to connect to. Defaults to 8000                                                                                              |
| `--print-default-expected-errors`   | Print the default expected errors                                                                                                                    |
| `--exclude-default-expected-errors` | Exclude the default expected errors                                                                                                                  |

## cuzz.json

You can create a `cuzz.json` file in the same directory as your canister's `dfx.json` file to configure `cuzz`. The `cuzz.json` file should contain a single JSON object with your desired configuration options, for example:

```json
{
    "canisterName": "my_very_own_canister",
    "callDelay": 0.1
}
```

Here are all the available options in `cuzz.json`:

| Option                         | Type                | Default             | Description                                                          |
| ------------------------------ | ------------------- | ------------------- | -------------------------------------------------------------------- |
| `callDelay`                    | `number`            | `0.1`               | Number of seconds between each canister method fuzz test call        |
| `candidPath`                   | `string`            | `undefined`         | Path to a candid file, instead of relying on candid:service metadata |
| `canisterName`                 | `string`            | `undefined`         | Name of the canister to fuzz test                                    |
| `clearConsole`                 | `boolean`           | `false`             | Clear the console between method calls                               |
| `deployArgs`                   | `string`            | `undefined`         | Arguments to pass to deploy command for canister init                |
| `excludeDefaultExpectedErrors` | `boolean`           | `false`             | Whether to exclude the default expected errors                       |
| `expectedErrors`               | `string[]`          | `[]`                | Array of regex patterns for expected errors to ignore                |
| `fabricateCycles`              | `string`            | `"100000000000000"` | Amount of cycles to fabricate when canister runs out                 |
| `port`                         | `number`            | `8000`              | Port of the ICP replica to connect to                                |
| `size`                         | `object`            | See below           | Size constraints for different Candid types                          |
| `silent`                       | `boolean`           | `false`             | Skip logging except for errors                                       |
| `skip`                         | `boolean \| string` | `false`             | Skip running the tests                                               |
| `skipDeploy`                   | `boolean`           | `false`             | Skip deployment of the canister                                      |
| `terminal`                     | `boolean`           | `false`             | Run tests in new terminal                                            |
| `textFilter`                   | `string[]`          | `[]`                | Array of strings to filter text values                               |
| `timeLimit`                    | `number`            | `0`                 | Time limit in minutes (0 means infinite)                             |

The `size` object can contain the following properties to constrain generated values:

| Type      | Default Min | Default Max |
| --------- | ----------- | ----------- |
| `blob`    | `0`         | `2_000_000` |
| `float32` | `-Infinity` | `Infinity`  |
| `float64` | `-Infinity` | `Infinity`  |
| `int`     | `-(2^127)`  | `2^127 - 1` |
| `int64`   | `-(2^63)`   | `2^63 - 1`  |
| `int32`   | `-(2^31)`   | `2^31 - 1`  |
| `int16`   | `-(2^15)`   | `2^15 - 1`  |
| `int8`    | `-(2^7)`    | `2^7 - 1`   |
| `nat`     | `0`         | `2^128 - 1` |
| `nat64`   | `0`         | `2^64 - 1`  |
| `nat32`   | `0`         | `2^32 - 1`  |
| `nat16`   | `0`         | `2^16 - 1`  |
| `nat8`    | `0`         | `2^8 - 1`   |
| `text`    | `0`         | `100_000`   |
| `vec`     | `0`         | `100`       |

Each size type accepts `min` and `max` properties to override the defaults. For example:

```json
{
    "size": {
        "text": {
            "min": 0,
            "max": 100000
        }
    }
}
```
