const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'slowmode',
  aliases: ['slow', 'ratelimit'],
  category: 'Moderation',
  description: 'Set the slowmode for a channel',
  userPerms: ['ManageChannels'],
  botPerms: ['ManageChannels'],
  cooldown: 5,
  slashOptions: [
    { name: 'seconds', description: 'Slowmode in seconds (0 to disable, max 21600)', type: 4, required: true, min_value: 0, max_value: 21600 },
    { name: 'channel', description: 'Channel (current if not specified)', type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('seconds'), interaction.options.getChannel('channel') || interaction.channel, client);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]), message.mentions.channels.first() || message.channel, client);
  },

  async _run(ctx, seconds, channel, client) {
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Slowmode must be 0–21600 seconds.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await channel.setRateLimitPerUser(seconds);
      const msg = seconds === 0 ? `Slowmode **disabled** in <#${channel.id}>.` : `Slowmode set to **${seconds}s** in <#${channel.id}>.`;
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏱️ Slowmode Updated\n${msg}\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
