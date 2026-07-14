import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotCommand, LoadedTrigger } from '@framework/framework';

export default class MyClient extends Client {
    commands: Collection<string, BotCommand>;
    triggers: Collection<string, LoadedTrigger>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildWebhooks,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        this.commands = new Collection<string, BotCommand>();
        this.triggers = new Collection<string, LoadedTrigger>();
    }
}
