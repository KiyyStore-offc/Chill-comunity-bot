const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const emoji = require('../../emojis.js');

const ALL_MODULES = [
  { id: 'antiBan',           label: 'Anti-Ban' },
  { id: 'antiKick',          label: 'Anti-Kick' },
  { id: 'antiChannelDelete', label: 'Anti-Channel Delete' },
  { id: 'antiRoleDelete',    label: 'Anti-Role Delete' },
  { id: 'antiWebhook',       label: 'Anti-Webhook' },
  { id: 'antiAdminGrant',    label: 'Anti-Admin Grant' },
  { id: 'antiBot',           label: 'Anti-Bot Add' },
];

function getSettings(client, guildId) {
  const s = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
  return s || { guildId, enabled: false, panic: false, punishment: 'kick', strictLevel: 1, whitelist: [], bypass: [], limits: {}, modules: {}, timeWindow: 10000 };
}

function activeModCount(mods) {
  return ALL_MODULES.filter(m => mods[m.id] !== false).length;
}

function buildDashboard(guild, settings) {
  const enabled = settings.enabled;
  const panic   = settings.panic || false;
  const mods    = settings.modules || {};
  const active  = activeModCount(mods);

  const statusLine = `\`STATUS  \` ${enabled ? '✅' : emoji.cross}  ${enabled ? 'Active' : 'Inactive'}`;
  const modLine    = `\`MODULES \` ${active} / ${ALL_MODULES.length} active`;
  const panicLine  = `\`PANIC   \` ${panic  ? '⚡' : emoji.cross}  ${panic  ? 'Enabled' : 'Disabled'}`;

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Security Dashboard`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${statusLine}\n${modLine}\n${panicLine}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${guild.name} — Protection Overview`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_enable').setLabel('Enable').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('an_disable').setLabel('Disable').setStyle(ButtonStyle.Danger)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_panic').setLabel(`Panic: ${panic ? 'ON' : 'OFF'}`).setStyle(ButtonStyle.Secondary)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_modules').setLabel('Modules').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('an_whitelist').setLabel('Whitelist').setStyle(ButtonStyle.Secondary)
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_extraowners').setLabel('Extra Owners').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('an_recovery').setLabel('Recovery').setStyle(ButtonStyle.Secondary)
      )
    );
}

function buildModulesPanel(settings) {
  const mods = settings.modules || {};
  const lines = ALL_MODULES.map(m => `${mods[m.id] === false ? '❌' : '✅'} ${m.label}`).join('\n');
  const enableOpts  = ALL_MODULES.filter(m => mods[m.id] === false);
  const disableOpts = ALL_MODULES.filter(m => mods[m.id] !== false);
  const rows = [];
  if (enableOpts.length)  rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('an_mod_enable').setPlaceholder('Enable a module...').addOptions(enableOpts.map(m => ({ label: m.label, value: m.id })))));
  if (disableOpts.length) rows.push(new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('an_mod_disable').setPlaceholder('Disable a module...').addOptions(disableOpts.map(m => ({ label: m.label, value: m.id })))));
  rows.push(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('an_back').setLabel('Back').setStyle(ButtonStyle.Secondary)));
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⚙️ AntiNuke — Modules\n${lines}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(...rows);
}

function buildWhitelistPanel(settings) {
  const wl = settings.whitelist || [];
  const listText = wl.length ? wl.map(id => `• <@${id}>`).join('\n') : '*No whitelisted users.*';
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📋 AntiNuke — Whitelist\n${listText}\n\nUse \`anwhitelist add @user\` to add users.\n-# These users bypass all AntiNuke checks.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('an_back').setLabel('Back').setStyle(ButtonStyle.Secondary)));
}

function buildExtraOwnersPanel(settings) {
  const owners = settings.extraOwners || [];
  const listText = owners.length ? owners.map(id => `• <@${id}>`).join('\n') : '*No extra owners set.*';
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 👑 AntiNuke — Extra Owners\n${listText}\n\nExtra owners can manage AntiNuke without being the server owner.\nUse \`anwhitelist extraowner @user\` to add one.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('an_back').setLabel('Back').setStyle(ButtonStyle.Secondary)));
}

function buildRecoveryPanel(guild) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 🛡️ AntiNuke — Recovery\nIf your server was nuked, use these commands:\n\n` +
      `\`anstatus\` — View recent AntiNuke actions\n\`anlogs\` — Detailed event logs\n\`anpunishment\` — Check punishment settings\n\n-# Contact support if you need further help.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('an_back').setLabel('Back').setStyle(ButtonStyle.Secondary)));
}

module.exports = {
  name: 'antinuke',
  aliases: ['an', 'nuke', 'security'],
  category: 'AntiNuke',
  description: 'AntiNuke security dashboard for your server',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) { return this._run(interaction, client, true); },
  async execute(message, args, client)    { return this._run(message, client, false); },

  async _run(ctx, client, isSlash) {
    const guild = ctx.guild;
    const user  = isSlash ? ctx.user : ctx.author;
    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel ? ctx.channel.send(opts) : ctx.reply(opts);
    };

    let settings = getSettings(client, guild.id);
    const msg = await reply({ components: [buildDashboard(guild, settings)], flags: MessageFlags.IsComponentsV2 });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ time: 120000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) return i.reply({ content: '❌ This dashboard is not yours.', flags: 64 });
      settings = getSettings(client, guild.id);

      if (i.customId === 'an_enable') {
        settings.enabled = true;
        if (client.db.antinuke) client.db.antinuke.set(guild.id, settings);
        return i.update({ components: [buildDashboard(guild, getSettings(client, guild.id))], flags: MessageFlags.IsComponentsV2 });
      }
      if (i.customId === 'an_disable') {
        settings.enabled = false;
        if (client.db.antinuke) client.db.antinuke.set(guild.id, settings);
        return i.update({ components: [buildDashboard(guild, getSettings(client, guild.id))], flags: MessageFlags.IsComponentsV2 });
      }
      if (i.customId === 'an_panic') {
        settings.panic = !settings.panic;
        if (client.db.antinuke) client.db.antinuke.set(guild.id, settings);
        return i.update({ components: [buildDashboard(guild, getSettings(client, guild.id))], flags: MessageFlags.IsComponentsV2 });
      }
      if (i.customId === 'an_modules')    return i.update({ components: [buildModulesPanel(settings)],    flags: MessageFlags.IsComponentsV2 });
      if (i.customId === 'an_whitelist')  return i.update({ components: [buildWhitelistPanel(settings)],  flags: MessageFlags.IsComponentsV2 });
      if (i.customId === 'an_extraowners')return i.update({ components: [buildExtraOwnersPanel(settings)],flags: MessageFlags.IsComponentsV2 });
      if (i.customId === 'an_recovery')   return i.update({ components: [buildRecoveryPanel(guild)],      flags: MessageFlags.IsComponentsV2 });
      if (i.customId === 'an_back')       return i.update({ components: [buildDashboard(guild, settings)],flags: MessageFlags.IsComponentsV2 });

      if (i.customId === 'an_mod_enable') {
        if (!settings.modules) settings.modules = {};
        settings.modules[i.values[0]] = true;
        if (client.db.antinuke) client.db.antinuke.set(guild.id, settings);
        return i.update({ components: [buildModulesPanel(getSettings(client, guild.id))], flags: MessageFlags.IsComponentsV2 });
      }
      if (i.customId === 'an_mod_disable') {
        if (!settings.modules) settings.modules = {};
        settings.modules[i.values[0]] = false;
        if (client.db.antinuke) client.db.antinuke.set(guild.id, settings);
        return i.update({ components: [buildModulesPanel(getSettings(client, guild.id))], flags: MessageFlags.IsComponentsV2 });
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### Security Dashboard\n*Session expired. Run \`antinuke\` to reopen.*\n-# Chill AntiNuke`
      ))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  }
};
