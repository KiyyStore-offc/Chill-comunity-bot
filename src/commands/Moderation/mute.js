const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const unit = match[2];
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * mult[unit];
}

module.exports = {
  name: 'mute',
  aliases: ['timeout', 'silence'],
  category: 'Moderation',
  description: 'Timeout (mute) a member',
  userPerms: ['ModerateMembers'],
  botPerms: ['ModerateMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to mute', type: 6, required: true },
    { name: 'duration', description: 'Duration (e.g. 10m, 1h, 1d)', type: 3, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    const dur = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, target, dur, reason, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const dur = args[1];
    const reason = args.slice(2).join(' ') || 'No reason provided';
    return this._run(message, target, dur, reason, client);
  },

  async _run(ctx, target, durStr, reason, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);

    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a user.`))], flags: MessageFlags.IsComponentsV2 });
    const duration = parseDuration(durStr);
    if (!duration) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Invalid duration. Use: \`10m\`, \`1h\`, \`2d\`, etc.`))], flags: MessageFlags.IsComponentsV2 });

    const member = guild.members.cache.get(target.id);
    if (!member) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Member not found.`))], flags: MessageFlags.IsComponentsV2 });
    if (!member.moderatable) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} I cannot timeout **${target.username}**.`))], flags: MessageFlags.IsComponentsV2 });

    try {
      await member.timeout(duration, `${reason} | By: ${author.username}`);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔇 Member Muted\n**User:** ${target.username} (\`${target.id}\`)\n**Duration:** \`${durStr}\`\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n\n-# Chill Moderation • Developed by AkiForver`));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
