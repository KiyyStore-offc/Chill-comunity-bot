const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'glist',
  aliases: ['giveaways', 'giveawaylist'],
  category: 'Giveaway',
  description: 'List all active giveaways in this server',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) { return this._run(interaction, client, true); },
  async execute(message, args, client) { return this._run(message, client, false); },

  async _run(ctx, client, isSlash) {
    const guild = ctx.guild;
    const send = async (o) => isSlash ? ctx.reply(o) : ctx.channel.send(o);
    const allGiveaways = client.db.giveaways?.find ? client.db.giveaways.find({ guildId: guild.id }) : [];
    const active = (allGiveaways || []).filter(g => !g.ended);

    if (active.length === 0) {
      return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.gwy || '🎉'} Active Giveaways\nNo active giveaways right now.\nStart one with \`giveaway <time> <winners> <prize>\`!`))], flags: MessageFlags.IsComponentsV2 });
    }

    const list = active.slice(0, 10).map((g, i) => {
      const endTs = g.endTime ? `<t:${Math.floor(parseInt(g.endTime) / 1000)}:R>` : 'Unknown';
      return `**${i + 1}.** ${g.prize} — <#${g.channelId}> — Ends ${endTs}`;
    }).join('\n');

    return send({ components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.gwy || '🎉'} Active Giveaways\n${list}\n\n-# ${active.length} active giveaway${active.length !== 1 ? 's' : ''}`))
    ], flags: MessageFlags.IsComponentsV2 });
  }
};
