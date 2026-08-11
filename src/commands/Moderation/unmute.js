const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'unmute',
  aliases: ['untimeout', 'unsilence'],
  category: 'Moderation',
  description: 'Remove timeout from a member',
  userPerms: ['ModerateMembers'],
  botPerms: ['ModerateMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to unmute', type: 6, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, target, reason, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    return this._run(message, target, args.slice(1).join(' ') || 'No reason provided', client);
  },

  async _run(ctx, target, reason, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a user.`))], flags: MessageFlags.IsComponentsV2 });
    const member = guild.members.cache.get(target.id);
    if (!member) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Member not found.`))], flags: MessageFlags.IsComponentsV2 });
    try {
      await member.timeout(null, `${reason} | By: ${author.username}`);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔊 Member Unmuted\n**User:** ${target.username}\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
