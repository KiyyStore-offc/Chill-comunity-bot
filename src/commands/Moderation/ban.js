const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'ban',
  aliases: ['banish', 'permaban'],
  category: 'Moderation',
  description: 'Ban a member from the server',
  userPerms: ['BanMembers'],
  botPerms: ['BanMembers'],
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to ban', type: 6, required: true },
    { name: 'reason', description: 'Reason for ban', type: 3, required: false },
    { name: 'delete_messages', description: 'Days of messages to delete (0-7)', type: 4, required: false, min_value: 0, max_value: 7 }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('delete_messages') || 0;
    return this._run({ author: interaction.user, guild: interaction.guild, member: interaction.member, editReply: (o) => interaction.editReply(o) }, target, reason, days, client, true);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    return this._run(message, target, reason, 0, client, false);
  },

  async _run(ctx, target, reason, days, client, isSlash) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const reply = async (opts) => isSlash ? ctx.editReply(opts) : ctx.channel.send(opts);

    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please provide a valid user to ban.`))], flags: MessageFlags.IsComponentsV2 });

    const member = guild.members.cache.get(target.id);
    if (member) {
      if (!member.bannable) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} I cannot ban **${target.username}**. They may have a higher role.`))], flags: MessageFlags.IsComponentsV2 });
      const authorMember = isSlash ? ctx.member : ctx.member;
      if (authorMember && member.roles.highest.position >= authorMember.roles.highest.position && guild.ownerId !== author.id) {
        return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You cannot ban someone with a higher or equal role.`))], flags: MessageFlags.IsComponentsV2 });
      }
    }

    try {
      await target.send({ content: `🔨 You have been **banned** from **${guild.name}**.\n**Reason:** ${reason}\n**Moderator:** ${author.tag || author.username}` }).catch(() => {});
      await guild.bans.create(target.id, { deleteMessageSeconds: days * 86400, reason: `${reason} | Banned by: ${author.tag || author.username}` });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🔨 Member Banned\n**User:** ${target.username} (\`${target.id}\`)\n**Reason:** ${reason}\n**Moderator:** ${author.username}\n**Messages Deleted:** ${days} day(s)\n\n-# Chill Moderation • Developed by AkiForver`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed to ban: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
