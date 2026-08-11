const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'gamble',
  aliases: ['bet', 'g'],
  category: 'Economy',
  description: 'Gamble your coins for a chance to double them',
  cooldown: 5,
  slashOptions: [{ name: 'amount', description: 'Amount to gamble (or "all")', type: 3, required: true }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0], client); },

  async _run(ctx, amountStr, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const wallet = eco.wallet || 0;
    const amount = amountStr?.toLowerCase() === 'all' ? wallet : parseInt(amountStr);
    if (!amount || amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Minimum gamble is 10 coins.`))], flags: MessageFlags.IsComponentsV2 });
    if (amount > wallet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You only have \`${formatNumber(wallet)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const win = Math.random() < 0.46;
    const multipliers = [1.5, 2, 2.5];
    const mult = multipliers[Math.floor(Math.random() * multipliers.length)];
    const result = win ? Math.floor(amount * mult) : 0;

    if (win) {
      const earned = result - amount;
      eco.wallet = wallet - amount + result;
      eco.totalEarned = (eco.totalEarned || 0) + earned;
      saveEcoData(client, userId, eco);
      client.db.transactions?.add(userId, 'gamble_win', earned, `Gamble x${mult}`);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎰 You Won!\n**${mult}x multiplier!** You won \`${formatNumber(result)} coins\`!\n> 💰 **Profit:** \`+${formatNumber(earned)}\` | 👛 **Wallet:** \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    } else {
      eco.wallet = wallet - amount;
      saveEcoData(client, userId, eco);
      client.db.transactions?.add(userId, 'gamble_lose', -amount, 'Gamble lost');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 😔 You Lost!\nYou lost \`${formatNumber(amount)} coins\`!\n> 👛 **Wallet:** \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
