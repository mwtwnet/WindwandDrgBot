import type {
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    Collection,
    ModalSubmitInteraction,
    SlashCommandBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import type MyClient from '@utils/myClient';

export interface BotCommand {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
    admin?: boolean;
    folder?: string;
    execute(interaction: ChatInputCommandInteraction, client: MyClient): Promise<unknown>;
    autocomplete?(interaction: AutocompleteInteraction, client: MyClient): Promise<unknown>;
}

export type CommandCollection = Collection<string, BotCommand>;

export type ComponentInteraction = ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction;

export interface BotTrigger {
    customId: string;
    execute(interaction: ComponentInteraction, client: MyClient, page?: number): Promise<unknown>;
}

export interface LoadedTrigger {
    trigger: BotTrigger;
    admin: boolean;
}

export interface BotEvent {
    name: string;
    once?: boolean;
    execute(...args: unknown[]): unknown;
}
