const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anwhitelist',
  aliases: ['nukewl', 'anwl'],
  category: 'AntiNuke',
  description: 'Add or remove users/roles from the anti-nuke whitelist',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add or remove', type: 3, required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }] },
    { name: 'user', description: 'User to whitelist', type: 6, required: false }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action');
    const target = interaction.options.getUser('user');
    return this._run(interaction, action, target?.id || null, client, true);
  },

  async execute(message, args, client, prefix) {
    const action = args[0]?.toLowerCase() || 'list';
    const mention = message.mentions.users.first();
    const targetId = mention?.id || args[1];
    return this._run(message, action, targetId, client, false);
  },

  async _run(ctx, action, targetId, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, whitelist: [] };
    const wl = current.whitelist || [];

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (action === 'add') {
      if (!targetId) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a user to whitelist.`));
        return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
      if (wl.includes(targetId)) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} <@${targetId}> is already whitelisted.`));
        return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
      wl.push(targetId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, whitelist: wl });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Whitelisted\n<@${targetId}> has been added to the **AntiNuke whitelist**.\n\n-# Total whitelisted: ${wl.length}`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'remove') {
      if (!targetId || !wl.includes(targetId)) {
        const container = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} User not found in whitelist.`));
        return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }
      const newWl = wl.filter(id => id !== targetId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, whitelist: newWl });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Removed from Whitelist\n<@${targetId}> has been removed from the **AntiNuke whitelist**.`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const listText = wl.length > 0 ? wl.map((id, i) => `\`${i + 1}.\` <@${id}>`).join('\n') : '`No users whitelisted.`';
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.whitelist} AntiNuke Whitelist\nUsers in this list will **never be punished** by the anti-nuke system.\n\n${listText}\n\n-# Total: ${wl.length} • Chill AntiNuke`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
