import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import enquirer from 'enquirer';

const { Input, Select } = enquirer;

type TriggerType = 'button' | 'modal' | 'select';

const triggerTypes: TriggerType[] = ['button', 'modal', 'select'];
const namePattern = /^[a-z0-9_-]{1,64}$/;

const interactionTypes: Record<TriggerType, string> = {
    button: 'ButtonInteraction',
    modal: 'ModalSubmitInteraction',
    select: 'StringSelectMenuInteraction',
};

function requiredName(value: string): boolean | string {
    return namePattern.test(value.trim())
        ? true
        : 'Use 1-64 lowercase letters, numbers, hyphens, or underscores.';
}

async function input(message: string, validate = requiredName): Promise<string> {
    return (await new Input({ name: 'value', message, validate }).run()).trim();
}

async function chooseOrCreateFolder(triggerRoot: string): Promise<string> {
    const folders = existsSync(triggerRoot)
        ? readdirSync(triggerRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name)
        : [];

    if (folders.length === 0) return input('Trigger folder');

    const createNew = '__create_new__';
    const selected = await new Select({
        name: 'folder',
        message: 'Trigger folder',
        choices: [...folders, { name: createNew, message: 'Create a new folder' }],
    }).run();

    return selected === createNew ? input('New trigger folder') : selected;
}

function triggerTemplate(type: TriggerType, customId: string): string {
    const interactionType = interactionTypes[type];
    const body = type === 'select'
        ? "await interaction.reply({ content: `Selected: ${interaction.values.join(', ')}`, flags: MessageFlags.Ephemeral });"
        : type === 'modal'
            ? "await interaction.reply({ content: 'Modal submitted!', flags: MessageFlags.Ephemeral });"
            : "await interaction.reply({ content: 'Button clicked!', flags: MessageFlags.Ephemeral });";

    return `import { MessageFlags } from 'discord.js';
import type { ${interactionType} } from 'discord.js';
import type MyClient from '../../utils/myClient.js';

export default {
    customId: '${customId}',

    async execute(interaction: ${interactionType}, _client: MyClient) {
        ${body}
    },
};
`;
}

async function main(): Promise<void> {
    if (process.argv.includes('help') || process.argv.includes('h')) {
        console.log('Usage: pnpm newtri [button|modal|select]');
        return;
    }

    const typeArgument = process.argv[2]?.toLowerCase();
    const type = triggerTypes.includes(typeArgument as TriggerType)
        ? typeArgument as TriggerType
        : await new Select<TriggerType>({
            name: 'type',
            message: 'Trigger type',
            choices: triggerTypes,
        }).run();

    const triggerRoot = join(import.meta.dirname, '..', 'trigger');
    const folder = await chooseOrCreateFolder(triggerRoot);
    const fileName = await input('Trigger file name');
    const customId = await input('Custom ID');
    const folderPath = join(triggerRoot, folder);
    const outputPath = join(folderPath, `${fileName}.ts`);

    if (existsSync(outputPath)) throw new Error(`File already exists: ${outputPath}`);

    mkdirSync(folderPath, { recursive: true });
    writeFileSync(outputPath, triggerTemplate(type, customId), 'utf8');
    console.log(`Created trigger: ${outputPath}`);
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
