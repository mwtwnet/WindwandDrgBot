

const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('server command'),

    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {

        const subCommand = interaction.options.getSubcommand();
        const subGroupCommand = interaction.options.getSubcommandGroup()
        
        const executeFile = require(`.${subGroupCommand ? `/[${subGroupCommand}]` : ''}/${subCommand}.js`)

        return await executeFile.execute(interaction, client)
        
    },

    /**
     * @param {import('discord.js').AutocompleteInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async autocomplete(interaction, client) {

        const subCommand = interaction.options.getSubcommand();
        const subGroupCommand = interaction.options.getSubcommandGroup()
        
        const executeFile = require(`.${subGroupCommand ? `/[${subGroupCommand}]` : ''}/${subCommand}.js`)

        return await executeFile.autocomplete(interaction, client)
    }
}
