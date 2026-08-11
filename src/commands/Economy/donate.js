const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'donate',
  aliases: ['contribution', 'fundpool'],
  category: 'Economy',
  description: 'Donate coins to the server jackpot pool',
  cooldown: 10,
  slashOptions: [{ name: 'amount', description: 'Amount to donate', type: 4, required: true, min_value: 100 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]), client);
  },

  async _run(ctx, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    const guildId = ctx.guild.id;
    if (!amount || amount < 100) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum donation is **100** coins.'))], flags: MessageFlags.IsComponentsV2 });

    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet||0)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet -= amount;
    saveEcoData(client, userId, eco);
    client.db.jackpot?.add(guildId, amount);
    const jp = client.db.jackpot?.get(guildId) || { pool: amount };
    client.db.transactions?.add(userId, 'donate', -amount, 'Donated to jackpot pool');

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 💝 Donation Received!\nThank you for your contribution to the jackpot pool!\n\n> 💰 Donated: \`${formatNumber(amount)}\` coins\n> 🎰 Pool now: \`${formatNumber(jp.pool)}\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
