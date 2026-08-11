const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'massban',
  aliases: ['mban', 'bulkban'],
  category: 'Moderation',
  description: 'Ban multiple users by ID at once',
  userPerms: ['BanMembers', 'Administrator'],
  botPerms: ['BanMembers'],
  cooldown: 10,
  slashOptions: [
    { name: 'userids', description: 'Space-separated user IDs to ban', type: 3, required: true },
    { name: 'reason', description: 'Reason', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply();
    const ids = interaction.options.getString('userids').split(/\s+/).filter(id => /^\d{17,20}$/.test(id));
    const reason = interaction.options.getString('reason') || 'Mass ban';
    return this._run({ author: interaction.user, guild: interaction.guild, editReply: (o) => interaction.editReply(o) }, ids, reason, client, true);
  },
  async execute(message, args, client) {
    const ids = args.filter(id => /^\d{17,20}$/.test(id));
    return this._run(message, ids, 'Mass ban', client, false);
  },

  async _run(ctx, ids, reason, client, isSlash) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (o) => isSlash ? ctx.editReply(o) : ctx.channel.send(o);
    if (!ids || ids.length === 0) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide valid user IDs.`))], flags: MessageFlags.IsComponentsV2 });

    let banned = 0, failed = 0;
    for (const id of ids.slice(0, 20)) {
      try { await guild.bans.create(id, { reason: `${reason} | By: ${author.username}` }); banned++; } catch { failed++; }
    }

    return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔨 Mass Ban Complete\n**Banned:** \`${banned}\` users\n**Failed:** \`${failed}\`\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
  }
};
