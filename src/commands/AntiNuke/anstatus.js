const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anstatus',
  aliases: ['nukestatus', 'antistatus'],
  category: 'AntiNuke',
  description: 'View the full anti-nuke configuration dashboard',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) { return this._run(interaction, client, true); },
  async execute(message, args, client, prefix) { return this._run(message, client, false); },

  async _run(ctx, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    if (!settings) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⚠️ AntiNuke Not Configured\nRun \`antinuke setup\` to configure the anti-nuke system.\n\n-# Chill AntiNuke • Developed by AkiForver`
        ));
      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const mods = settings.modules || {};
    const lims = settings.limits || {};
    const strictLabels = { 1: '🟢 Low', 2: '🟡 Medium', 3: '🔴 High', 4: '☢️ Paranoid' };
    const punishLabels = { ban: '🔨 Ban', kick: '👢 Kick', strip: '🎭 Strip Roles', warn: '⚠️ Warn Only', timeout: '⏰ Timeout' };

    const moduleStatus = [
      `${mods.antiBan !== false ? '✅' : '❌'} Anti-Ban (\`${lims.ban || 3}\`)`,
      `${mods.antiKick !== false ? '✅' : '❌'} Anti-Kick (\`${lims.kick || 5}\`)`,
      `${mods.antiChannelDelete !== false ? '✅' : '❌'} Anti-Channel Delete (\`${lims.channelDelete || 3}\`)`,
      `${mods.antiRoleDelete !== false ? '✅' : '❌'} Anti-Role Delete (\`${lims.roleDelete || 3}\`)`,
      `${mods.antiWebhook !== false ? '✅' : '❌'} Anti-Webhook (\`${lims.webhookCreate || 3}\`)`,
      `${mods.antiAdminGrant !== false ? '✅' : '❌'} Anti-Admin Grant`,
      `${mods.antiBot !== false ? '✅' : '❌'} Anti-Bot Add`,
    ].join('\n');

    const enableBtn = new ButtonBuilder()
      .setCustomId('antinuke_enable')
      .setLabel(settings.enabled ? 'Already Enabled' : 'Enable')
      .setStyle(settings.enabled ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(settings.enabled);

    const disableBtn = new ButtonBuilder()
      .setCustomId('antinuke_disable')
      .setLabel(settings.enabled ? 'Disable' : 'Already Disabled')
      .setStyle(settings.enabled ? ButtonStyle.Danger : ButtonStyle.Secondary)
      .setDisabled(!settings.enabled);

    const row = new ActionRowBuilder().addComponents(enableBtn, disableBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🛡️ Chill AntiNuke — Full Dashboard\n` +
        `**Guild:** ${ctx.guild.name}\n` +
        `**Status:** ${settings.enabled ? '🟢 Active' : '🔴 Inactive'}\n\n` +
        `**Punishment:** ${punishLabels[settings.punishment] || '👢 Kick'}\n` +
        `**Strict Level:** ${strictLabels[settings.strictLevel || 1]} (Level ${settings.strictLevel || 1})\n` +
        `**Log Channel:** ${settings.logChannel ? `<#${settings.logChannel}>` : '`Not Set`'}\n` +
        `**Whitelisted:** ${(settings.whitelist || []).length} users\n` +
        `**Bypass:** ${(settings.bypass || []).length} users\n` +
        `**Time Window:** \`${(settings.timeWindow || 10000) / 1000}s\``
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Modules & Limits:**\n${moduleStatus}`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Chill AntiNuke • Developed by AkiForver • <t:${Math.floor(Date.now() / 1000)}:R>`))
      .addActionRowComponents(row);

    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
