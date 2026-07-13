import { Events } from 'discord.js';
import type { Message } from 'discord.js';
import { drgApplySet } from './staticMessage/drg-apply.js';
import type MyClient from './myClient.js';

import config from '#root/config.json' with { type: 'json' };

const { Role } = config;

export default {
    name: Events.MessageCreate,

    /**
     * @param {import('discord.js').Message} message 
     * @param {import('discord.js').Client} client 
     */

    async execute(message: Message, _client: MyClient) {
        // Admin can call command like [<command> <args>]
        const commandRegex = /^\[.*\]$/;

        if (message.author.bot) return;
        if (!commandRegex.test(message.content)) return;
        const commandName = message.content.slice(1, -1).trim().toLowerCase().split(' ');
        const cmd = commandName.shift();

        const arg = {
            first: commandName[0],
            second: commandName[1],
            third: commandName[2]
        }

        switch (cmd) {
            case 'drg.apply':
                if (!message.member?.roles.cache.some(role => role.id === Role.AdminRoleId)) return;
                if(arg.first === 'set') await drgApplySet(message);
                // someFunction();
                return;
            default:
                return;
        }

    }
};
