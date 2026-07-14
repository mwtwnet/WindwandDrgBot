import { Events } from 'discord.js';
import type { Message } from 'discord.js';
import { Role } from '@function/data';
import { drgApplySet } from '@utils/apply/message';
import type MyClient from '@utils/myClient';

export default {
    name: Events.MessageCreate,

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
