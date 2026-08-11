const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'movemember',
  aliases: ['moveto', 'vcmove'],
  category: 'Moderation',
  description: 'Move a member to a different voice channel',
  userPerms: ['MoveMembers'],
  botPerms: ['MoveMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to move', type: 6, required: true },
    { name: 'channel', description: 'Voice channel to move to', type: 7, required: true }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getChannel('channel'), client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const channel = message.mentions.channels.first();
    return this._run(message, target, channel, client);
  },

  async _run(ctx, target, channel, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target || !channel) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Usage: \`move @user #voice-channel\``))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member?.voice.channel) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} **${target.username}** is not in a voice channel.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await member.voice.setChannel(channel.id);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📍 Member Moved\n**${target.username}** moved to <#${channel.id}>.\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
