import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import logger from '@function/log';
import { isModuleFile, moduleExtension, moduleIndexFile } from '@function/modules';

interface CommandModule {
    data?: {
        name?: unknown;
    };
}

export async function configCheck(): Promise<boolean> {
    logger.box('Config Check');

    const checks = [
        await subCommandMismatchChecker(),
    ];
    const errorCount = checks.filter(result => !result).length;

    if (errorCount > 0) {
        logger.line();
        logger.error(`Config check failed with ${errorCount} error(s).`);
        return false;
    }

    logger.success('Config check passed with no errors.');
    return true;
}

async function subCommandMismatchChecker(): Promise<boolean> {
    const commandsRoot = path.join(import.meta.dirname, '..', 'commands');
    const bracketFolderRegex = /^\[.+\]$/;
    let checkedCount = 0;
    let mismatchCount = 0;
    let loadErrorCount = 0;

    async function walk(directory: string, insideBracketFolder: boolean): Promise<void> {
        const entries = fs.readdirSync(directory, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                await walk(entryPath, insideBracketFolder || bracketFolderRegex.test(entry.name));
                continue;
            }

            if (!insideBracketFolder || !isModuleFile(entry.name) || entry.name === moduleIndexFile()) {
                continue;
            }

            checkedCount++;
            const expectedName = path.basename(entry.name, moduleExtension);

            try {
                const imported = await import(pathToFileURL(entryPath).href) as { default: CommandModule };
                const actualName = imported.default.data?.name;

                if (typeof actualName !== 'string') {
                    loadErrorCount++;
                    logger.warn(`[Command Name Check] Missing command.data.name in: ${entryPath}`);
                    continue;
                }

                if (actualName !== expectedName) {
                    mismatchCount++;
                    logger.warn(`[Command Name Check] Mismatch in ${entryPath} (file: "${expectedName}", data.name: "${actualName}")`);
                }
            } catch (error) {
                loadErrorCount++;
                logger.warn(`[Command Name Check] Failed to load command file: ${entryPath}`);
                logger.error(error);
            }
        }
    }

    if (!fs.existsSync(commandsRoot)) {
        logger.warn('[Command Name Check] commands folder not found.');
        return false;
    }

    logger.box('Subcommand Filename Check');
    await walk(commandsRoot, false);

    if (checkedCount === 0) {
        logger.info('[Command Name Check] No command files found under [xxx] folders.');
        return true;
    }

    if (mismatchCount === 0 && loadErrorCount === 0) {
        logger.success(`[Command Name Check] Passed (${checkedCount} file(s) checked).`);
        return true;
    }

    logger.warn(`[Command Name Check] Found ${mismatchCount} mismatch(es), ${loadErrorCount} load error(s), checked ${checkedCount} file(s).`);
    return false;
}
