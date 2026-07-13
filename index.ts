import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { pathToFileURL } from 'node:url';

import { color } from 'console-log-colors';
import dotenv from 'dotenv';

import logger from './function/log.js';
import { isModuleFile, moduleExtension, moduleIndexFile } from './function/modules.js';
import type { BotCommand, BotTrigger } from './types/framework.js';
import MyClient from './utils/myClient.js';

dotenv.config();

interface BotEvent {
    name: string;
    once?: boolean;
    execute(...args: unknown[]): unknown;
}

const client = new MyClient();

async function configCheck(): Promise<boolean> {
    logger.box('Config Check');
    const valid = await subCommandMismatchChecker();

    if (!valid) {
        logger.line();
        logger.error('Config check failed with 1 error.');
        return false;
    }

    logger.success('Config check passed with no errors.');
    return true;
}

async function subCommandMismatchChecker(): Promise<boolean> {
    const commandsRoot = path.join(import.meta.dirname, 'commands');
    const bracketFolder = /^\[.+\]$/;
    let checkedCount = 0;
    let mismatchCount = 0;
    let loadErrorCount = 0;

    async function walk(directory: string, insideBracketFolder: boolean): Promise<void> {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const entryPath = path.join(directory, entry.name);

            if (entry.isDirectory()) {
                await walk(entryPath, insideBracketFolder || bracketFolder.test(entry.name));
                continue;
            }

            if (!insideBracketFolder || !isModuleFile(entry.name) || entry.name === moduleIndexFile()) continue;

            checkedCount++;
            const expectedName = path.basename(entry.name, moduleExtension);

            try {
                const { default: command } = await import(pathToFileURL(entryPath).href) as { default: BotCommand };
                const actualName = command.data.name;

                if (actualName !== expectedName) {
                    mismatchCount++;
                    logger.warn(`[Command Name Check] Mismatch in ${entryPath} (file: "${expectedName}", data.name: "${actualName}")`);
                }
            } catch (error) {
                loadErrorCount++;
                logger.warn(`[Command Name Check] Failed to load command file: ${entryPath}`);
                console.error(error);
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

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

async function loadCommands(): Promise<number> {
    const commandsRoot = path.join(import.meta.dirname, 'commands');
    const folders = fs.readdirSync(commandsRoot);
    const maximumNameLength = Math.max(1, ...folders.map(folder => folder.length));
    let count = 0;

    for (const folder of folders) {
        const folderPath = path.join(commandsRoot, folder);
        const entries = fs.readdirSync(folderPath);
        const directFiles = entries.filter(isModuleFile);
        const rootFolders = entries.filter(entry => (
            /^\[.*\]$/.test(entry)
            && fs.statSync(path.join(folderPath, entry)).isDirectory()
        ));
        let loadMessage = '';

        for (const file of directFiles) {
            const filePath = path.join(folderPath, file);
            const { default: command } = await import(pathToFileURL(filePath).href) as { default: BotCommand };
            command.admin = folder.toLowerCase() === 'admin';
            client.commands.set(command.data.name, command);
            loadMessage += color.gray('│ ') + color.cyan(`[${file}] `);
            count++;
        }

        for (const rootFolder of rootFolders) {
            const indexPath = path.join(folderPath, rootFolder, moduleIndexFile());
            const { default: command } = await import(pathToFileURL(indexPath).href) as { default: BotCommand };
            command.admin = folder.toLowerCase() === 'admin';
            client.commands.set(command.data.name, command);
            loadMessage += color.gray('│ ') + color.cyan(`[${rootFolder}] `);
            count++;
        }

        const spaces = ' '.repeat(maximumNameLength - folder.length);
        console.log(color.grey('⟐ ') + color.green('Load ') + color.c75(`[${folder}]${spaces} » `) + loadMessage);
    }

    logger.success(`Loaded ${count} command(s).`);
    return count;
}

async function loadTriggerSummary(): Promise<number> {
    const triggerRoot = path.join(import.meta.dirname, 'trigger');
    if (!fs.existsSync(triggerRoot)) return 0;

    let count = 0;
    for (const folder of fs.readdirSync(triggerRoot)) {
        const folderPath = path.join(triggerRoot, folder);
        let loadMessage = '';

        for (const file of fs.readdirSync(folderPath).filter(isModuleFile)) {
            const filePath = path.join(folderPath, file);
            const { default: trigger } = await import(pathToFileURL(filePath).href) as { default: BotTrigger };
            if (!trigger.customId || typeof trigger.execute !== 'function') {
                logger.warn(`Trigger ${filePath} is missing customId or execute.`);
                continue;
            }

            loadMessage += color.gray('│ ') + color.cyan(`[${file}] `);
            count++;
        }

        console.log(color.grey('⟐ ') + color.green('Load ') + color.c75(`[${folder}] » `) + loadMessage);
    }

    logger.success(`Loaded ${count} trigger(s).`);
    return count;
}

async function loadEventDirectory(directoryName: 'events' | 'utils'): Promise<string[]> {
    const directory = path.join(import.meta.dirname, directoryName);
    const loaded: string[] = [];
    const emitter = client as unknown as EventEmitter;

    for (const file of fs.readdirSync(directory).filter(isModuleFile)) {
        const filePath = path.join(directory, file);
        const imported = await import(pathToFileURL(filePath).href) as { default?: Partial<BotEvent> };
        const event = imported.default;

        if (!event || typeof event.name !== 'string' || typeof event.execute !== 'function') continue;

        const listener = (...args: unknown[]): void => {
            void Promise.resolve(event.execute?.(...args, client)).catch(error => {
                logger.error(`Unhandled error in ${directoryName}/${file}`);
                logger.error(error);
            });
        };

        if (event.once) emitter.once(event.name, listener);
        else emitter.on(event.name, listener);

        loaded.push(`${event.once ? '[Once]' : '[On]'} ${file}`);
    }

    return loaded;
}

function displayLoadedModules(events: string[], utilities: string[]): void {
    const eventColumnWidth = 48;

    console.log(color.yellow(
        'Loading Events'.padEnd(eventColumnWidth) + 'Loading Utils',
    ));

    const rowCount = Math.max(events.length, utilities.length);
    for (let index = 0; index < rowCount; index++) {
        const eventModule = events[index] ?? '';
        const utilityModule = utilities[index] ?? '';
        console.log(
            color.cyan(eventModule.padEnd(eventColumnWidth))
            + color.cyan(utilityModule),
        );
    }

    logger.success(`Loaded ${events.length} event module(s) and ${utilities.length} utility event module(s).`);
}

async function init(): Promise<void> {
    if (!await configCheck()) {
        logger.error('Initialization aborted due to config errors.');
        process.exit(1);
    }

    logger.line();
    await loadCommands();
    await loadTriggerSummary();

    const [events, utilities] = await Promise.all([
        loadEventDirectory('events'),
        loadEventDirectory('utils'),
    ]);

    displayLoadedModules(events, utilities);
    await client.login(requiredEnv('TOKEN'));
}

process.on('SIGINT', () => {
    logger.warn('Caught interrupt signal, shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught Exception:');
    logger.error(error);
    logger.saveErrorLog(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:');
    logger.error(reason);
    const error = reason instanceof Error ? reason : String(reason);
    logger.saveErrorLog(error, 'unhandledRejection', { promise: String(promise) });
});

void init();
