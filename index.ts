#!/usr/bin/env -S npx tsx

import { program } from 'commander';
import { execSync } from 'child_process';
import * as candid from '@dfinity/candid';
import { parse_candid } from './candid_parser_wasm/pkg';
import * as fs from 'fs';

main();

async function main() {
    program
        .option('--canister-name <name>', `name of the canister`)
        .option('--skip-deploy', 'skip deployment and just get candid')
        .option('--candid-path <path>', 'path to candid file to read from');

    program.parse();

    const options = program.opts();
    const canisterName: string = options.canisterName;
    const skipDeploy: boolean = options.skipDeploy ?? false;
    const candidPath: string | undefined = options.candidPath;

    const candidService: string = candidPath
        ? fs.readFileSync(candidPath, 'utf-8')
        : !skipDeploy
        ? (execSync(`dfx deploy ${canisterName}`, { stdio: 'inherit' }),
          execSync(`dfx canister metadata ${canisterName} candid:service`, {
              encoding: 'utf-8'
          }))
        : execSync(`dfx canister metadata ${canisterName} candid:service`, {
              encoding: 'utf-8'
          });

    console.log('candid:service', candidService);

    const ast = parse_candid(candidService);

    console.log('ast', JSON.stringify(ast, null, 4));
}
