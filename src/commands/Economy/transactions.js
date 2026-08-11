const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'transactions',
  aliases: ['history', 'txns'],
  category: 'Economy',
  description: 'View your recent transaction history',
  cooldown: 5,
  slashOptions: [{ name: 'limit', description: 'Number to show (1-20)', type: 4, required: false, min_value: 1, max_value: 20 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('limit') || 10, client);
  },
  async execute(message, args, client) { return this._run(message, parseInt(args[0]) || 10, client); },

  async _run(ctx, limit, client) {
    const userId = (ctx.author || ctx.user).id;
    const txns = client.db.transactions ? client.db.transactions.get(userId, Math.min(20, limit)) : [];

    if (!txns || txns.length === 0) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📋 Transaction History\nNo transactions yet! Start earning coins.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    const list = txns.map(t => {
      const sign = t.amount >= 0 ? '+' : '';
      const ts = t.timestamp ? `<t:${Math.floor(parseInt(t.timestamp) / 1000)}:R>` : '';
      return `${t.amount >= 0 ? '📈' : '📉'} **${t.type}** — \`${sign}${formatNumber(t.amount)}\` ${ts}\n  *${t.description || ''}*`;
    }).join('\n');

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📋 Recent Transactions\n${list}\n\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
