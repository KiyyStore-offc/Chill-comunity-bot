const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ComponentType
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anpunishment',
  aliases: ['anpunish', 'nukepunish'],
  category: 'AntiNuke',
  description: 'Set the punishment applied to nukers when detected',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run(interaction, client, true);
  },

  async execute(message, args, client, prefix) {
    return this._run(message, client, false);
  },

  async _run(ctx, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, punishment: 'kick' };

    const reply = async (opts) => {
      if (isSlash) {
        if (ctx.replied || ctx.deferred) return ctx.followUp(opts);
        return ctx.reply(opts);
      }
      return ctx.channel.send(opts);
    };

    const select = new StringSelectMenuBuilder()
      .setCustomId('anpunishment_select')
      .setPlaceholder(`Current: ${current.punishment?.toUpperCase() || 'KICK'}`)
      .addOptions([
        { label: '<:mod:1504192145404198965> Ban', value: 'ban', description: 'Permanently ban the nuker from the server' },
        { label: '<:down:1504198662123814954> Kick', value: 'kick', description: 'Kick the nuker from the server' },
        { label: '<:emoji_39:1504448689337274520> Strip All Roles', value: 'strip', description: 'Remove every role from the nuker' },
        { label: '<:emoji_1:1504190199121313822> Warn & Log Only', value: 'warn', description: 'Just log the event, no action taken' },
        { label: '<:load:1504197792636076082> Timeout (60min)', value: 'timeout', description: 'Timeout the nuker for 60 minutes' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔨 AntiNuke — Punishment Settings\n` +
        `Choose what happens to users detected as nukers.\n\n` +
        `**Current Punishment:** \`${(current.punishment || 'kick').toUpperCase()}\`\n\n` +
        `> <:mod:1504192145404198965> **Ban** — Permanently removes the nuker\n` +
        `> <:down:1504198662123814954> **Kick** — Removes temporarily (can rejoin)\n` +
        `> <:emoji_39:1504448689337274520> **Strip** — Removes all roles (stays in server)\n` +
        `> <:emoji_1:1504190199121313822> **Warn** — Only logs, takes no action\n` +
        `> <:load:1504197792636076082> **Timeout** — 60 minute timeout\n\n` +
        `-# Select from the dropdown below • Chill AntiNuke`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const sent = isSlash ? await ctx.fetchReply().catch(() => null) : msg;
    if (!sent) return;

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
    collector.on('collect', async (i) => {
      const userId = isSlash ? ctx.user.id : ctx.author.id;
      if (i.user.id !== userId) {
        return i.reply({ content: `${emoji.cross} This menu is not for you.`, flags: MessageFlags.Ephemeral });
      }
      const value = i.values[0];
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, punishment: value });
      const labels = { ban: '<:mod:1504192145404198965> Ban', kick: '<:down:1504198662123814954> Kick', strip: '<:emoji_39:1504448689337274520> Strip Roles', warn: '<:emoji_1:1504190199121313822> Warn Only', timeout: '<:load:1504197792636076082> Timeout' };
      const done = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Punishment Updated\n` +
          `Nukers will now receive: **${labels[value] || value}**\n\n` +
          `-# Chill AntiNuke • Developed by AkiForver`
        ));
      await i.update({ components: [done], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        const disabled = new StringSelectMenuBuilder(select.data).setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabled);
        const updated = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### <:emoji_2:1504190435000582374> AntiNuke — Punishment Settings\n-# This menu has timed out.`
          ))
          .addActionRowComponents(disabledRow);
        sent.edit({ components: [updated], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
      }
    });
  }
};
