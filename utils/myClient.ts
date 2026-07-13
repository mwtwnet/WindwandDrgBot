import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { BotCommand } from '../types/framework.js';

export default class MyClient extends Client {
    commands: Collection<string, BotCommand>;

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
    }
}
