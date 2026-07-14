import { SlashCommandBuilder } from 'discord.js';
import type { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type MyClient from '@utils/myClient';

interface SubcommandOptions {
    getSubcommand(): string;
    getSubcommandGroup(required?: boolean): string | null;
}

async function getExecuteFile(options: SubcommandOptions) {
    const subcommand = options.getSubcommand();
    const group = options.getSubcommandGroup(false);
    const groupFolder = group ? `/[${group}]` : '';
    return (await import(new URL(`.${groupFolder}/${subcommand}.js`, import.meta.url).href)).default;
}

export default {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Apply control command'),

    async execute(interaction: ChatInputCommandInteraction, client: MyClient) {
        const command = await getExecuteFile(interaction.options);
        return command.execute?.(interaction, client);
    },

    async autocomplete(interaction: AutocompleteInteraction, client: MyClient) {
        const command = await getExecuteFile(interaction.options);
        return command.autocomplete?.(interaction, client);
    },
};
