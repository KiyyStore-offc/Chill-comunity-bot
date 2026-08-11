const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'deposit',
  aliases: ['dep'],
  category: 'Economy',
  description: 'Deposit coins into your bank',
  cooldown: 5,
  slashOptions: [{ name: 'amount', description: 'Amount or "all"', type: 3, required: true }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0], client); },

  async _run(ctx, amountStr, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const wallet = eco.wallet || 0;
    const amount = amountStr?.toLowerCase() === 'all' ? wallet : parseInt(amountStr);
    if (!amount || amount < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Invalid amount. Use \`deposit <amount>\` or \`deposit all\`.`))], flags: MessageFlags.IsComponentsV2 });
    if (amount > wallet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You only have \`${formatNumber(wallet)}\` coins in your wallet.`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = wallet - amount;
    eco.bank = (eco.bank || 0) + amount;
    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.bank} Deposited!\n**+${formatNumber(amount)} coins** deposited to bank.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\` | 🏦 Bank: \`${formatNumber(eco.bank)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
