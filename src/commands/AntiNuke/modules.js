const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ComponentType
} = require('discord.js');
const emoji = require('../../emojis.js');

const moduleList = [
  { id: 'antiBan', label: '🔨 Anti-Ban', description: 'Detect and punish mass bans' },
  { id: 'antiKick', label: '👢 Anti-Kick', description: 'Detect and punish mass kicks' },
  { id: 'antiChannelDelete', label: '📺 Anti-Channel Delete', description: 'Detect mass channel deletions' },
  { id: 'antiRoleDelete', label: '🏷️ Anti-Role Delete', description: 'Detect mass role deletions' },
  { id: 'antiWebhook', label: '🔗 Anti-Webhook', description: 'Detect mass webhook creation' },
  { id: 'antiAdminGrant', label: '👑 Anti-Admin Grant', description: 'Detect unauthorized admin grants' },
  { id: 'antiBot', label: '🤖 Anti-Bot Add', description: 'Detect unauthorized bot additions' },
];

module.exports = {
  name: 'anmodules',
  aliases: ['nukemodules', 'anmod'],
  category: 'AntiNuke',
  description: 'Toggle individual anti-nuke protection modules on/off',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) { return this._run(interaction, client, true); },
  async execute(message, args, client, prefix) { return this._run(message, client, false); },

  async _run(ctx, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, modules: {} };
    const mods = current.modules || {};

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    const enableSelect = new StringSelectMenuBuilder()
      .setCustomId('anmodules_enable')
      .setPlaceholder('Enable a module...')
      .addOptions(moduleList.filter(m => mods[m.id] === false).map(m => ({ label: m.label, value: m.id, description: m.description })));

    const disableSelect = new StringSelectMenuBuilder()
      .setCustomId('anmodules_disable')
      .setPlaceholder('Disable a module...')
      .addOptions(moduleList.filter(m => mods[m.id] !== false).map(m => ({ label: m.label, value: m.id, description: m.description })));

    const rows = [];
    if (enableSelect.options.length > 0) rows.push(new ActionRowBuilder().addComponents(enableSelect));
    if (disableSelect.options.length > 0) rows.push(new ActionRowBuilder().addComponents(disableSelect));

    const statusText = moduleList.map(m => `${mods[m.id] === false ? '❌' : '✅'} ${m.label}`).join('\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚙️ AntiNuke — Modules\nToggle individual protection modules on or off.\n\n` + statusText +
        `\n\n-# Chill AntiNuke • Developed by AkiForver`
      ))
      .addSeparatorComponents(new SeparatorBuilder());

    for (const r of rows) container.addActionRowComponents(r);

    const msg = await reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    const sent = isSlash ? await ctx.fetchReply().catch(() => null) : msg;
    if (!sent) return;

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
    collector.on('collect', async (i) => {
      const userId = isSlash ? ctx.user.id : ctx.author.id;
      if (i.user.id !== userId) return i.reply({ content: `${emoji.cross} Not for you.`, flags: MessageFlags.Ephemeral });
      const modId = i.values[0];
      const enable = i.customId === 'anmodules_enable';
      mods[modId] = enable;
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, modules: mods });
      const done = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Module ${enable ? 'Enabled' : 'Disabled'}\n` +
          `**${moduleList.find(m => m.id === modId)?.label || modId}** has been ${enable ? '✅ enabled' : '❌ disabled'}.\n\n` +
          `-# Chill AntiNuke • Developed by AkiForver`
        ));
      await i.update({ components: [done], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
  }
};
