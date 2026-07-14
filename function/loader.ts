import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { color } from 'console-log-colors';
import logger from './log.js';
import { isModuleFile, moduleIndexFile } from './modules.js';
import type { BotCommand, BotEvent, BotTrigger, LoadedTrigger } from '@framework/framework.js';
import type MyClient from '@utils/myClient.js';

type EventDirectory = 'events' | 'utils';

function repositoryPath(directory: string): string {
    return path.join(import.meta.dirname, '..', directory);
}

function folderNames(directory: string): string[] {
    return fs.readdirSync(repositoryPath(directory), { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
}

function maximumFolderNameLength(): number {
    const folders = [...folderNames('commands'), ...folderNames('trigger')];
    return Math.max(1, ...folders.map(folder => folder.length));
}

function loadLine(folder: string, maximumNameLength: number, modules: string[]): void {
    const spaces = ' '.repeat(maximumNameLength - folder.length);
    const moduleList = modules
        .map(module => color.gray('│ ') + color.cyan(`[${module}] `))
        .join('');

    console.log(color.grey('⟐ ') + color.green('Load ') + color.c75(`[${folder}]${spaces} » `) + moduleList);
}

async function importDefault<T>(filePath: string): Promise<T> {
    const imported = await import(pathToFileURL(filePath).href) as { default: T };
    return imported.default;
}

export async function loadCommands(client: MyClient): Promise<number> {
    const commandsRoot = repositoryPath('commands');
    const bracketFolder = /^\[.*\]$/;
    const maximumNameLength = maximumFolderNameLength();
    let count = 0;

    client.commands.clear();

    for (const folder of folderNames('commands')) {
        const folderPath = path.join(commandsRoot, folder);
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        const commandPaths = entries
            .filter(entry => entry.isFile() && isModuleFile(entry.name))
            .map(entry => ({ label: entry.name, filePath: path.join(folderPath, entry.name) }));
        const rootCommandPaths = entries
            .filter(entry => entry.isDirectory() && bracketFolder.test(entry.name))
            .map(entry => ({
                label: entry.name,
                filePath: path.join(folderPath, entry.name, moduleIndexFile()),
            }));
        const loadedModules: string[] = [];

        for (const commandPath of [...commandPaths, ...rootCommandPaths]) {
            const command = await importDefault<BotCommand>(commandPath.filePath);
            if (!command.data || typeof command.execute !== 'function') {
                logger.warn(`Command ${commandPath.filePath} is missing data or execute.`);
                continue;
            }

            command.folder = folder;
            command.admin = folder.toLowerCase() === 'admin';
            client.commands.set(command.data.name, command);
            loadedModules.push(commandPath.label);
            count++;
        }

        loadLine(folder, maximumNameLength, loadedModules);
    }

    console.log(color.gray(`${'─'.repeat(maximumNameLength + 16)}┤                     [Successfully loaded ${count} commands]`));
    return count;
}

export async function loadTriggers(client: MyClient): Promise<number> {
    const triggerRoot = repositoryPath('trigger');
    const maximumNameLength = maximumFolderNameLength();
    let count = 0;

    client.triggers.clear();

    for (const folder of folderNames('trigger')) {
        const folderPath = path.join(triggerRoot, folder);
        const loadedModules: string[] = [];

        for (const file of fs.readdirSync(folderPath).filter(isModuleFile)) {
            const filePath = path.join(folderPath, file);
            const trigger = await importDefault<BotTrigger>(filePath);
            if (!trigger.customId || typeof trigger.execute !== 'function') {
                logger.warn(`Trigger ${filePath} is missing customId or execute.`);
                continue;
            }

            const loadedTrigger: LoadedTrigger = {
                trigger,
                admin: file.includes('[admin]'),
            };
            client.triggers.set(trigger.customId, loadedTrigger);
            loadedModules.push(file);
            count++;
        }

        loadLine(folder, maximumNameLength, loadedModules);
    }

    console.log(color.gray(`${'═'.repeat(maximumNameLength + 16)}╧═════════════════════[Successfully loaded ${count} trigger]`));
    return count;
}

function isBotEvent(value: unknown): value is BotEvent {
    if (typeof value !== 'object' || value === null) return false;
    const event = value as Partial<BotEvent>;
    return typeof event.name === 'string' && typeof event.execute === 'function';
}

async function loadEventDirectory(client: MyClient, directoryName: EventDirectory): Promise<string[]> {
    const directory = repositoryPath(directoryName);
    const loaded: string[] = [];

    for (const file of fs.readdirSync(directory).filter(isModuleFile)) {
        const filePath = path.join(directory, file);
        const event = await importDefault<unknown>(filePath);
        if (!isBotEvent(event)) continue;

        const listener = (...args: unknown[]): void => {
            void Promise.resolve(event.execute(...args, client)).catch(error => {
                logger.error(`Unhandled error in ${directoryName}/${file}`);
                logger.error(error);
            });
        };

        if (event.once) client.once(event.name, listener);
        else client.on(event.name, listener);

        const eventType = event.once ? '[\x1B[32mOnce\x1B[0m]' : '[\x1B[34mOn\x1B[0m]';
        loaded.push(`${eventType.padEnd(10)} ${file}`);
    }

    return loaded;
}

function displayEvents(events: string[], utilities: string[]): void {
    const eventColumnWidth = 43;
    console.log(color.yellow('[Loading Events...]               [Loading Utils...]'));

    for (let index = 0; index < Math.max(events.length, utilities.length); index++) {
        console.log((events[index] ?? '').padEnd(eventColumnWidth) + (utilities[index] ?? ''));
    }
}

export async function loadEvents(client: MyClient): Promise<void> {
    const [events, utilities] = await Promise.all([
        loadEventDirectory(client, 'events'),
        loadEventDirectory(client, 'utils'),
    ]);
    displayEvents(events, utilities);
}
