const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');
const { endGiveaway } = require('../../utils/giveawayManager.js');

module.exports = {
  name: 'greroll',
  aliases: ['giveawayreroll', 'rerollgw'],
  category: 'Giveaway',
  description: 'Reroll winners for an ended giveaway',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    { name: 'message_id', description: 'Message ID of the giveaway', type: 3, required: true },
    { name: 'winners', description: 'Number of winners to reroll', type: 4, required: false, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    return this._run({ editReply: (o) => interaction.editReply(o), guild: interaction.guild, channel: interaction.channel }, interaction.options.getString('message_id'), interaction.options.getInteger('winners'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0], parseInt(args[1]), client);
  },

  async _run(ctx, messageId, winnerCount, client) {
    const send = async (o) => ctx.editReply ? ctx.editReply(o) : ctx.channel.send(o);
    if (!messageId) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Provide the giveaway message ID.'))], flags: MessageFlags.IsComponentsV2 });

    const giveaway = client.db.giveaways ? client.db.giveaways.get(messageId) : null;
    if (!giveaway) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Giveaway not found.'))], flags: MessageFlags.IsComponentsV2 });
    if (!giveaway.ended) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This giveaway has not ended yet.'))], flags: MessageFlags.IsComponentsV2 });

    const participants = giveaway.participants || [];
    const count = winnerCount || giveaway.winnerCount || 1;
    if (participants.length === 0) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No participants to reroll.'))], flags: MessageFlags.IsComponentsV2 });

    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    const newWinners = shuffled.slice(0, count).map(id => `<@${id}>`);

    const channel = ctx.guild?.channels.cache.get(giveaway.channelId);
    if (channel) channel.send(`🎉 **Giveaway Reroll!** New winner${newWinners.length > 1 ? 's' : ''}: ${newWinners.join(', ')} — **${giveaway.prize}**`).catch(() => {});

    return send({ components: [new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.gwy || '🎉'} Giveaway Rerolled!\n**Prize:** ${giveaway.prize}\n**New winners:** ${newWinners.join(', ')}`
      ))], flags: MessageFlags.IsComponentsV2 });
  }
};
