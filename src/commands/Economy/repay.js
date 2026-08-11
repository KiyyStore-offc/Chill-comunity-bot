const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'repay',
  aliases: ['payloan', 'returnloan'],
  category: 'Economy',
  description: 'Repay your loan',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const loan = client.db.loans ? client.db.loans.get(userId) : null;
    if (!loan) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ No Loan\nYou have no outstanding loans! Use \`loan\` to borrow coins.`))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < loan.amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(loan.amount)}\` to repay but only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = (eco.wallet || 0) - loan.amount;
    saveEcoData(client, userId, eco);
    if (client.db.loans) client.db.loans.delete(userId);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Loan Repaid!\nYou repaid \`${formatNumber(loan.amount)}\` coins to the Chill Bank!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
