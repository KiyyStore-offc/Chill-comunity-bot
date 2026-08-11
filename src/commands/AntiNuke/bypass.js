const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anbypass',
  aliases: ['nukebypass', 'bypass'],
  category: 'AntiNuke',
  description: 'Manage users who bypass anti-nuke detection (trusted admins)',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add, remove, or list', type: 3, required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }] },
    { name: 'user', description: 'User to bypass', type: 6, required: false }
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
    const current = settings || { guildId, bypass: [] };
    const bp = current.bypass || [];

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (action === 'add') {
      if (!targetId) {
        return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention a user.`))], flags: MessageFlags.IsComponentsV2 });
      }
      if (bp.includes(targetId)) {
        return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.warn} <@${targetId}> is already in the bypass list.`))], flags: MessageFlags.IsComponentsV2 });
      }
      bp.push(targetId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, bypass: bp });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Bypass Added\n<@${targetId}> will **bypass** anti-nuke detection.\n\n` +
          `> ⚠️ This user can perform mass actions without being punished.\n\n-# Only add fully trusted users!`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'remove') {
      if (!targetId || !bp.includes(targetId)) {
        return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} User not found in bypass list.`))], flags: MessageFlags.IsComponentsV2 });
      }
      const newBp = bp.filter(id => id !== targetId);
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, bypass: newBp });
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.check} Bypass Removed\n<@${targetId}> has been removed from the bypass list.`));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const listText = bp.length > 0 ? bp.map((id, i) => `\`${i + 1}.\` <@${id}>`).join('\n') : '`No bypass users set.`';
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📋 AntiNuke Bypass List\nThese users **bypass** anti-nuke detection entirely.\n\n${listText}\n\n` +
        `> ⚠️ Only add **fully trusted admins/bots** here.\n-# Total: ${bp.length} • Chill AntiNuke`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
