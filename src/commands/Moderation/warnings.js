const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'warnings',
  aliases: ['warns', 'warnlist'],
  category: 'Moderation',
  description: 'View warnings for a member',
  userPerms: ['ModerateMembers'],
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to check', type: 6, required: true }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const guild = ctx.guild;
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);
    if (!target) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide a user.'))], flags: MessageFlags.IsComponentsV2 });

    const warns = client.db.warnings ? client.db.warnings.get(guild.id, target.id) : null;
    const warnList = warns?.list || [];

    if (warnList.length === 0) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⚠️ Warnings — ${target.username}\nNo warnings found for this user! 🎉\n\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
    }

    const list = warnList.map((w, i) =>
      `\`${i + 1}.\` **${w.reason}**\n   By: <@${w.moderator}> • <t:${Math.floor(w.timestamp / 1000)}:R>`
    ).join('\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚠️ Warnings — ${target.username}\n**Total:** \`${warnList.length}\`\n\n${list}\n\n-# Chill Moderation • Developed by AkiForver`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
