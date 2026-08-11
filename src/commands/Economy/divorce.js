const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'divorce',
  aliases: ['breakup', 'splitup'],
  category: 'Economy',
  description: 'End your marriage',
  cooldown: 10,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const marriage = client.db.marriage?.get(userId);
    if (!marriage) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You are not married!\n-# Chill Economy'))], flags: MessageFlags.IsComponentsV2 });

    let partnerName = marriage.partnerId;
    try { const u = await client.users.fetch(marriage.partnerId); partnerName = u?.username || partnerName; } catch {}

    client.db.marriage?.delete(userId, marriage.partnerId);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 💔 Divorced\nYou and **${partnerName}** are no longer married.\nYou've lost your daily bonus.\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
