import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import enquirer from 'enquirer';

const { Input, Select } = enquirer;

type CommandMode = 'command' | 'subcommand' | 'subgroupcommand';

const modes: CommandMode[] = ['command', 'subcommand', 'subgroupcommand'];
const commandNamePattern = /^[a-z0-9_-]{1,32}$/;

async function input(message: string, validate?: (value: string) => boolean | string): Promise<string> {
    return (await new Input({
        name: 'value',
        message,
        validate: validate ?? (value => value.trim() ? true : 'This field is required.'),
    }).run()).trim();
}

function commandNameValidator(value: string): boolean | string {
    return commandNamePattern.test(value.trim())
        ? true
        : 'Use 1-32 lowercase letters, numbers, hyphens, or underscores.';
}

async function choose<T extends string>(message: string, choices: T[]): Promise<T> {
    if (choices.length === 0) throw new Error(`No choices available for: ${message}`);
    return new Select<T>({ name: 'value', message, choices }).run();
}

function listDirectories(directory: string, bracketed = false): string[] {
    if (!existsSync(directory)) return [];
    return readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && (!bracketed || /^\[.+\]$/.test(entry.name)))
        .map(entry => bracketed ? entry.name.slice(1, -1) : entry.name)
        .sort();
}

function escapeText(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function directCommandTemplate(name: string, description: string): string {
    return `import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '../../utils/myClient.js';

export default {
    data: new SlashCommandBuilder()
        .setName('${name}')
        .setDescription('${escapeText(description)}'),

    async execute(interaction: ChatInputCommandInteraction, _client: MyClient) {
        const embed = new EmbedBuilder().setDescription('TODO');
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },

    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {},
};
`;
}

function rootCommandTemplate(name: string, description: string): string {
    return `import { SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '../../../utils/myClient.js';

interface SubcommandOptions {
    getSubcommand(): string;
    getSubcommandGroup(required?: boolean): string | null;
}

async function getExecuteFile(options: SubcommandOptions) {
    const subcommand = options.getSubcommand();
    const group = options.getSubcommandGroup(false);
    const groupFolder = group ? \`/[\${group}]\` : '';
    return (await import(new URL(\`.\${groupFolder}/\${subcommand}.js\`, import.meta.url).href)).default;
}

export default {
    data: new SlashCommandBuilder()
        .setName('${name}')
        .setDescription('${escapeText(description)}'),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient) {
        const command = await getExecuteFile(interaction.options);
        return command.execute?.(interaction, client);
    },

    async autocomplete(interaction: AutocompleteInteraction, client: MyClient) {
        const command = await getExecuteFile(interaction.options);
        return command.autocomplete?.(interaction, client);
    },
};
`;
}

function subcommandTemplate(name: string, description: string, clientImportDepth: number): string {
    const clientPath = '../'.repeat(clientImportDepth) + 'utils/myClient.js';
    return `import { SlashCommandSubcommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '${clientPath}';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('${name}')
        .setDescription('${escapeText(description)}'),

    async execute(_interaction: ChatInputCommandInteraction, _client: MyClient) {},
    async autocomplete(_interaction: AutocompleteInteraction, _client: MyClient) {},
};
`;
}

function groupTemplate(name: string, description: string): string {
    return `import { SlashCommandSubcommandGroupBuilder } from 'discord.js';

export default {
    data: new SlashCommandSubcommandGroupBuilder()
        .setName('${name}')
        .setDescription('${escapeText(description)}'),
};
`;
}

function writeNewFile(filePath: string, content: string): void {
    if (existsSync(filePath)) throw new Error(`File already exists: ${filePath}`);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf8');
    console.log(`Created command: ${filePath}`);
}

async function main(): Promise<void> {
    if (process.argv.includes('help') || process.argv.includes('h')) {
        console.log('Usage: pnpm newcmd [command|subcommand|subgroupcommand]');
        return;
    }

    const argument = process.argv[2]?.toLowerCase();
    const mode = modes.includes(argument as CommandMode)
        ? argument as CommandMode
        : await choose('Command type', modes);
    const commandsRoot = join(import.meta.dirname, '..', 'commands');
    const categories = listDirectories(commandsRoot);
    const category = categories.length > 0
        ? await choose('Command category', categories)
        : await input('Command category', commandNameValidator);
    const categoryPath = join(commandsRoot, category);

    if (mode === 'command') {
        const name = await input('Command name', commandNameValidator);
        const description = await input('Command description');
        writeNewFile(join(categoryPath, `${name}.ts`), directCommandTemplate(name, description));
        return;
    }

    const roots = listDirectories(categoryPath, true);
    let rootName: string;
    if (roots.length === 0) {
        rootName = await input('Root command name', commandNameValidator);
        const rootDescription = await input('Root command description');
        writeNewFile(join(categoryPath, `[${rootName}]`, 'index.ts'), rootCommandTemplate(rootName, rootDescription));
    } else {
        rootName = await choose('Root command', roots);
    }

    const rootPath = join(categoryPath, `[${rootName}]`);

    if (mode === 'subcommand') {
        const name = await input('Subcommand name', commandNameValidator);
        const description = await input('Subcommand description');
        writeNewFile(join(rootPath, `${name}.ts`), subcommandTemplate(name, description, 3));
        return;
    }

    const groups = listDirectories(rootPath, true);
    const createGroup = '__create_new__';
    const selectedGroup = groups.length > 0
        ? await choose('Subcommand group', [...groups, createGroup])
        : createGroup;
    let groupName = selectedGroup;

    if (selectedGroup === createGroup) {
        groupName = await input('Subcommand group name', commandNameValidator);
        const groupDescription = await input('Subcommand group description');
        writeNewFile(join(rootPath, `[${groupName}]`, 'index.ts'), groupTemplate(groupName, groupDescription));
    }

    const name = await input('Grouped subcommand name', commandNameValidator);
    const description = await input('Grouped subcommand description');
    writeNewFile(join(rootPath, `[${groupName}]`, `${name}.ts`), subcommandTemplate(name, description, 4));
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
