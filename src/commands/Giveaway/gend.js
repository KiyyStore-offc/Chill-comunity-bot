const {
  ContainerBuilder, TextDisplayBuilder, MessageFlags
} = require('discord.js');
const emoji = require('../../emojis.js');
const { endGiveaway } = require('../../utils/giveawayManager.js');

module.exports = {
  name: 'gend',
  aliases: ['giveawayend', 'endgw'],
  category: 'Giveaway',
  description: 'End a giveaway early',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [{ name: 'message_id', description: 'Message ID of the giveaway', type: 3, required: true }],

  async slashExecute(interaction, client) {
    await interaction.deferReply({ flags: 64 });
    return this._run({ editReply: (o) => interaction.editReply(o), guild: interaction.guild }, interaction.options.getString('message_id'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0], client); },

  async _run(ctx, messageId, client) {
    const send = async (o) => ctx.editReply ? ctx.editReply(o) : ctx.channel.send(o);
    if (!messageId) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Provide the giveaway message ID.'))], flags: MessageFlags.IsComponentsV2 });
    const giveaway = client.db.giveaways ? client.db.giveaways.get(messageId) : null;
    if (!giveaway) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Giveaway not found.'))], flags: MessageFlags.IsComponentsV2 });
    if (giveaway.ended) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This giveaway already ended.'))], flags: MessageFlags.IsComponentsV2 });
    await endGiveaway(client, giveaway).catch(console.error);
    return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.gwy || '🎉'} Giveaway Ended\n**Prize:** ${giveaway.prize} has been ended early.`))], flags: MessageFlags.IsComponentsV2 });
  }
};
