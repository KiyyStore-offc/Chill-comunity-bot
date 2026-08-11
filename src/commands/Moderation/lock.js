const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'lock',
  aliases: ['lockdown', 'lockch'],
  category: 'Moderation',
  description: 'Lock a channel, preventing members from sending messages',
  userPerms: ['ManageChannels'],
  botPerms: ['ManageChannels'],
  cooldown: 5,
  slashOptions: [
    { name: 'channel', description: 'Channel to lock (current if not specified)', type: 7, required: false },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, channel, reason, client);
  },
  async execute(message, args, client) {
    const channel = message.mentions.channels.first() || message.channel;
    return this._run(message, channel, args.join(' ') || 'No reason provided', client);
  },

  async _run(ctx, channel, reason, client) {
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    try {
      await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false }, { reason: `${reason} | By: ${author.username}` });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔒 Channel Locked\n<#${channel.id}> has been **locked**.\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n\n-# Chill Moderation • Developed by AkiForver`));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
