process.on('uncaughtException', (error: Error) => handleUncaughtError(error));
process.on('unhandledRejection', (reason: any) => handleUncaughtError(reason));

function handleUncaughtError(error: Error): never {
    const prefix = 'Cuzz Error';

    console.error(`${prefix}: ${error.stack}`);

    process.exit(1);
}
