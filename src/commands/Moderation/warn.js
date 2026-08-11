const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'warn',
  aliases: ['warning', 'caution'],
  category: 'Moderation',
  description: 'Issue a warning to a member',
  userPerms: ['ModerateMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to warn', type: 6, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: true }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getString('reason'), client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const reason = args.slice(1).join(' ') || 'No reason provided';
    return this._run(message, target, reason, client);
  },

  async _run(ctx, target, reason, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a user.`))], flags: MessageFlags.IsComponentsV2 });
    if (target.bot) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You can't warn bots.`))], flags: MessageFlags.IsComponentsV2 });

    const warns = client.db.warnings ? client.db.warnings.get(guild.id, target.id) : null;
    const warnList = warns?.list || [];
    const newWarn = { reason, moderator: author.id, timestamp: Date.now() };
    warnList.push(newWarn);
    if (client.db.warnings) client.db.warnings.set(guild.id, target.id, { list: warnList });

    try { await target.send({ content: `⚠️ You have been **warned** in **${guild.name}**.\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n**Total Warnings:** ${warnList.length}` }).catch(() => {}); } catch {}

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚠️ Warning Issued\n**User:** ${target.username} (\`${target.id}\`)\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n**Total Warnings:** ${warnList.length}\n\n-# Chill Moderation • Developed by AkiForver`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
