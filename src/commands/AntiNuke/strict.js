const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ComponentType
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'anstrict',
  aliases: ['nukestrictlevel', 'strict'],
  category: 'AntiNuke',
  description: 'Set the strict level of the anti-nuke system (1=Low → 4=Paranoid)',
  userPerms: ['Administrator'],
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) { return this._run(interaction, client, true); },
  async execute(message, args, client, prefix) { return this._run(message, client, false); },

  async _run(ctx, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.antinuke ? client.db.antinuke.get(guildId) : null;
    const current = settings || { guildId, strictLevel: 1 };

    const reply = async (opts) => {
      if (isSlash) { if (ctx.replied || ctx.deferred) return ctx.followUp(opts); return ctx.reply(opts); }
      return ctx.channel.send(opts);
    };

    const limitSets = {
      1: { ban: 5, kick: 8, channelDelete: 5, roleDelete: 5, webhookCreate: 5, timeWindow: 15000 },
      2: { ban: 3, kick: 5, channelDelete: 3, roleDelete: 3, webhookCreate: 3, timeWindow: 10000 },
      3: { ban: 2, kick: 3, channelDelete: 2, roleDelete: 2, webhookCreate: 2, timeWindow: 8000 },
      4: { ban: 1, kick: 1, channelDelete: 1, roleDelete: 1, webhookCreate: 1, timeWindow: 5000 },
    };

    const select = new StringSelectMenuBuilder()
      .setCustomId('anstrict_select')
      .setPlaceholder(`Current Level: ${current.strictLevel || 1}`)
      .addOptions([
        { label: '🟢 Level 1 — Low', value: '1', description: 'Relaxed: Ban 5, Kick 8, Channel/Role Delete 5' },
        { label: '🟡 Level 2 — Medium', value: '2', description: 'Balanced: Ban 3, Kick 5, Channel/Role Delete 3' },
        { label: '🔴 Level 3 — High', value: '3', description: 'Strict: Ban 2, Kick 3, Channel/Role Delete 2' },
        { label: '☢️ Level 4 — Paranoid', value: '4', description: 'Maximum: Ban 1, Kick 1, Channel/Role Delete 1' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    const l = current.strictLevel || 1;
    const currentLimits = limitSets[l];
    const levelLabel = { 1: '🟢 Low', 2: '🟡 Medium', 3: '🔴 High', 4: '☢️ Paranoid' };

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ☢️ AntiNuke — Strict Level\n` +
        `Controls how sensitive the anti-nuke system is.\n\n` +
        `**Current Level:** ${levelLabel[l]} (Level ${l})\n` +
        `**Time Window:** \`${currentLimits.timeWindow / 1000}s\`\n\n` +
        `**Current Limits:**\n` +
        `> Ban: \`${currentLimits.ban}\` • Kick: \`${currentLimits.kick}\`\n` +
        `> Channel Delete: \`${currentLimits.channelDelete}\` • Role Delete: \`${currentLimits.roleDelete}\`\n` +
        `> Webhook: \`${currentLimits.webhookCreate}\`\n\n` +
        `-# Higher level = lower action limits = more sensitive`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    const sent = isSlash ? await ctx.fetchReply().catch(() => null) : msg;
    if (!sent) return;

    const collector = sent.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
    collector.on('collect', async (i) => {
      const userId = isSlash ? ctx.user.id : ctx.author.id;
      if (i.user.id !== userId) return i.reply({ content: `${emoji.cross} This is not for you.`, flags: MessageFlags.Ephemeral });
      const value = parseInt(i.values[0]);
      const limits = limitSets[value];
      if (client.db.antinuke) client.db.antinuke.set(guildId, { ...current, strictLevel: value, limits, timeWindow: limits.timeWindow });
      const done = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.check} Strict Level Updated\n` +
          `Anti-nuke level set to **${levelLabel[value]} (Level ${value})**\n\n` +
          `**New Limits:** Ban \`${limits.ban}\` • Kick \`${limits.kick}\` • Channel/Role \`${limits.channelDelete}\`\n\n` +
          `-# Chill AntiNuke • Developed by AkiForver`
        ));
      await i.update({ components: [done], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
  }
};
