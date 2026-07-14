import { Events } from 'discord.js';
import type { Message } from 'discord.js';
import { findSimilarCommands } from '@function/commandSearch';
import type { CommandTree } from '@function/commandSearch';
import { Role } from '@function/data';
import { sleep } from '@function/time';
import { drgApply } from '@utils/apply/message';
import type MyClient from '@utils/myClient';

const Commands: CommandTree = {
    drg: {
        apply: {
            msg: {
                create: 'Creating the application message in the designated channel.',
            },
            channel: {
                set: 'Setting the application channel to the current channel.',
            },
        },
    },
};

export default {
    name: Events.MessageCreate,

    async execute(message: Message, _client: MyClient) {
        // Admin can call command like [<command> <args>]
        const commandRegex = /^\[.*\]$/;

        if (message.author.bot) return;
        if (!commandRegex.test(message.content)) return;
        if (!message.member?.roles.cache.some(role => role.id === Role.AdminRoleId)) return;
        const commandParts = message.content.slice(1, -1).trim().toLowerCase().split(/\s+/);
        const command = commandParts.join('.');
        const root = commandParts[0];

        const args = {
            root: root,
            first: commandParts[1] ?? '',
            second: commandParts[2] ?? '',
            third: commandParts[3] ?? '',
            last: commandParts[commandParts.length - 1] ?? '',
        }

        switch (command) {
            case 'drg.apply.msg.channel.set':
            case 'drg.apply.msg.create':
                await drgApply(message, args.last);
                break;
            default:
                await suggestion(message, command, root);
                break;
        }

        await sleep(5000);
        await message.delete();

    },
};

async function suggestion(message: Message, command: string, root: string | undefined): Promise<void> {
    const matches = findSimilarCommands(Commands, command, root);
    const enteredCommand = command.split('.').join(' ');

    if (matches.length === 0) {
        await message.reply(`> Unknown command \`[${enteredCommand}]\`.`).then(async msg => {
            await sleep(3000);
            await msg.delete();
        });
        return;
    }

    const suggestions = matches
        .map(match => `> \`[${match.name.split('.').join(' ')}]\` — ${match.description}`)
        .join('\n');
    await message.reply(`> Unknown command \`[${enteredCommand}]\`. Did you mean:\n${suggestions}`).then(async msg => {
        await sleep(5000);
        await msg.delete();
    });
}
