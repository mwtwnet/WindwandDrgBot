import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REST, Routes } from 'discord.js';
import type {
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
} from 'discord.js';
import dotenv from 'dotenv';
import { isModuleFile, moduleIndexFile } from '../function/modules.js';

dotenv.config();

interface DirectCommand {
    data: SlashCommandBuilder;
    execute: (...args: unknown[]) => unknown;
}

interface SubcommandModule {
    data: SlashCommandSubcommandBuilder;
    execute: (...args: unknown[]) => unknown;
}

interface SubcommandGroupModule {
    data: SlashCommandSubcommandGroupBuilder;
}

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

async function importDefault<T>(filePath: string): Promise<T> {
    return (await import(pathToFileURL(filePath).href) as { default: T }).default;
}

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
const commandsRoot = join(import.meta.dirname, '..', 'commands');
const bracketFolder = /^\[.*\]$/;

for (const category of readdirSync(commandsRoot)) {
    const categoryPath = join(commandsRoot, category);
    const entries = readdirSync(categoryPath);
    const commandFiles = entries.filter(isModuleFile);
    const rootFolders = entries.filter(entry => (
        bracketFolder.test(entry)
        && statSync(join(categoryPath, entry)).isDirectory()
    ));

    for (const file of commandFiles) {
        const command = await importDefault<DirectCommand>(join(categoryPath, file));
        commands.push(command.data.toJSON());
    }

    for (const rootFolder of rootFolders) {
        const rootPath = join(categoryPath, rootFolder);
        const rootCommand = await importDefault<DirectCommand>(join(rootPath, moduleIndexFile()));
        const rootEntries = readdirSync(rootPath);

        for (const file of rootEntries.filter(file => isModuleFile(file) && file !== moduleIndexFile())) {
            const command = await importDefault<SubcommandModule>(join(rootPath, file));
            rootCommand.data.addSubcommand(command.data);
        }

        const groupFolders = rootEntries.filter(entry => (
            bracketFolder.test(entry)
            && statSync(join(rootPath, entry)).isDirectory()
        ));

        for (const groupFolder of groupFolders) {
            const groupPath = join(rootPath, groupFolder);
            const group = await importDefault<SubcommandGroupModule>(join(groupPath, moduleIndexFile()));

            for (const file of readdirSync(groupPath).filter(file => isModuleFile(file) && file !== moduleIndexFile())) {
                const command = await importDefault<SubcommandModule>(join(groupPath, file));
                group.data.addSubcommand(command.data);
            }

            rootCommand.data.addSubcommandGroup(group.data);
        }

        commands.push(rootCommand.data.toJSON());
    }
}

const rest = new REST().setToken(requireEnv('TOKEN'));

try {
    console.log(`Started refreshing ${commands.length} application command(s).`);
    const data = await rest.put(
        Routes.applicationGuildCommands(requireEnv('CLIENTID'), requireEnv('GUILDID')),
        { body: commands },
    );
    const count = Array.isArray(data) ? data.length : commands.length;
    console.log(`Successfully reloaded ${count} application command(s).`);
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
