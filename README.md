# cuzz

`cuzz` is a simple black-box generational fuzzer for locally-deployed Internet Computer Protocol (ICP) canisters.

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
-   [Traps, crashes, or other similar error conditions](#traps-crashes-or-other-similar-error-conditions)
-   [Memory leaks](#memory-leaks)
-   [cuzz.json](#cuzzjson)
-   [Cycles](#cycles)

## Prerequisites

-   dfx
-   node and npm

## Installation

```bash
npm install -g https://github.com/demergent-labs/cuzz
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

## Traps, crashes, or other similar error conditions

To find traps, crashes, or other similar error conditions, run `cuzz` until its process ends in an unexpected way. Due to the nature of the randomly generated arguments, you will want to filter out expected errors using the `expectedErrors` property in your `cuzz.json` file:

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

## cuzz.json

You can create a `cuzz.json` file in the same directory as your canister's `dfx.json` file to configure `cuzz`.

To learn about the available configurations, please see [the TypeScript type for `CuzzConfig`](https://github.com/demergent-labs/cuzz/blob/main/src/types.ts#L83).

## Cycles

`cuzz` will automatically fabricate cycles to a canister when it encounters an error due to lack of cycles. You can configure the amount of cycles to fabricate using the `fabricateCycles` property in your `cuzz.json` file:

```json
{
    "fabricateCycles": "100000000000000"
}
```
