const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');
const { endGiveaway } = require('../../utils/giveawayManager.js');

function parseDuration(str) {
  if (!str) return null;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  return parseInt(match[1]) * (map[match[2].toLowerCase()] || 0);
}

function formatEndTime(ms) {
  const date = new Date(Date.now() + ms);
  const rel = ms < 3600000
    ? `in ${Math.floor(ms / 60000)} minute${Math.floor(ms / 60000) !== 1 ? 's' : ''}`
    : ms < 86400000
    ? `in ${Math.floor(ms / 3600000)} hour${Math.floor(ms / 3600000) !== 1 ? 's' : ''}`
    : `in ${Math.floor(ms / 86400000)} day${Math.floor(ms / 86400000) !== 1 ? 's' : ''}`;

  const formatted = date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
  return `${rel} (${formatted})`;
}

function buildGiveawayMessage(prize, endTime, host, winners) {
  const gwyEmoji = emoji.gwy || '🎉';
  return new ContainerBuilder()
    .setAccentColor(0xFFBA00)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${prize}**`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `• **Ends:** ${formatEndTime(endTime - Date.now())}\n` +
      `• **Hosted by:** <@${host.id}>\n` +
      `• **Winners:** ${winners}\n\n` +
      `React with ${gwyEmoji} to enter!`
    ));
}

module.exports = {
  name: 'giveaway',
  aliases: ['gw', 'gcreate', 'gstart'],
  category: 'Giveaway',
  description: 'Start a giveaway in this channel',
  userPerms: ['ManageGuild'],
  botPerms: ['AddReactions', 'ReadMessageHistory'],
  cooldown: 10,
  slashOptions: [
    { name: 'prize',    description: 'What are you giving away?',          type: 3, required: true },
    { name: 'duration', description: 'Duration (e.g. 1d, 12h, 30m)',       type: 3, required: true },
    { name: 'winners',  description: 'Number of winners (default: 1)',      type: 4, required: false, min_value: 1, max_value: 20 },
    { name: 'channel',  description: 'Channel to host giveaway in',         type: 7, required: false }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    const prize    = interaction.options.getString('prize');
    const duration = interaction.options.getString('duration');
    const winners  = interaction.options.getInteger('winners') || 1;
    const channel  = interaction.options.getChannel('channel') || interaction.channel;
    return this._run({ author: interaction.user, guild: interaction.guild, editReply: (o) => interaction.editReply(o) }, prize, duration, winners, channel, client);
  },

  async execute(message, args, client) {
    const prize    = args.slice(2).join(' ') || args[0] || null;
    const duration = args[0];
    const winners  = parseInt(args[1]) || 1;
    const channel  = message.mentions.channels.first() || message.channel;
    if (!prize || !duration) {
      const hint = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.gwy} Giveaway — Usage\n` +
          `\`giveaway <time> <winners> <prize>\`\n\n` +
          `**Example:** \`giveaway 1d 1 Discord Nitro\`\n` +
          `**Time formats:** \`30m\` \`2h\` \`1d\` \`1w\``
        ));
      return message.channel.send({ components: [hint], flags: MessageFlags.IsComponentsV2 });
    }
    return this._run(message, prize, duration, winners, channel, client);
  },

  async _run(ctx, prize, durationStr, winners, channel, client) {
    const author = ctx.author || ctx.user;
    const guild  = ctx.guild;
    const ms     = parseDuration(durationStr);
    const sendErr = async (text) => {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
      if (ctx.editReply) return ctx.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
      return ctx.channel?.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    };

    if (!ms || ms < 10000) return sendErr(`❌ Invalid duration. Use formats like \`30m\`, \`2h\`, \`1d\`.`);
    if (ms > 2592000000)   return sendErr(`❌ Max duration is 30 days.`);

    const endTime    = Date.now() + ms;
    const container  = buildGiveawayMessage(prize, endTime, author, winners);

    const sent = await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const gwyEmoji = emoji.gwy?.match(/<:.+:(\d+)>/)?.[1] || '🎉';
    await sent.react(gwyEmoji).catch(() => sent.react('🎉').catch(() => {}));

    const giveawayData = {
      messageId:    sent.id,
      guildId:      guild.id,
      channelId:    channel.id,
      prize,
      hostId:       author.id,
      winnerCount:  winners,
      endTime:      endTime.toString(),
      ended:        false,
      participants: []
    };
    if (client.db.giveaways) client.db.giveaways.set(sent.id, giveawayData);

    setTimeout(async () => {
      const latest = client.db.giveaways ? client.db.giveaways.get(sent.id) : giveawayData;
      if (latest && !latest.ended) await endGiveaway(client, latest).catch(console.error);
    }, ms);

    const confirm = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.gwy || '🎉'} Giveaway Started!\n**Prize:** ${prize}\n**Channel:** <#${channel.id}>\n**Duration:** ${durationStr}\n**Winners:** ${winners}`
      ));

    if (ctx.editReply) return ctx.editReply({ components: [confirm], flags: MessageFlags.IsComponentsV2 });
    if (channel.id !== ctx.channel?.id) return ctx.channel.send({ components: [confirm], flags: MessageFlags.IsComponentsV2 });
  }
};
