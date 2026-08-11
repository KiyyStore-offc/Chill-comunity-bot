const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'unlock',
  aliases: ['unlockch', 'unlockchannel'],
  category: 'Moderation',
  description: 'Unlock a channel',
  userPerms: ['ManageChannels'],
  botPerms: ['ManageChannels'],
  cooldown: 5,
  slashOptions: [{ name: 'channel', description: 'Channel to unlock', type: 7, required: false }],

  async slashExecute(interaction, client) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, channel, client);
  },
  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || message.channel;
    return this._run(message, channel, client);
  },

  async _run(ctx, channel, client) {
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    try {
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null });
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔓 Channel Unlocked\n<#${channel.id}> has been **unlocked**.\n**Moderator:** ${author.username}\n\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
