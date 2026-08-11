const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const INVESTMENTS = [
  { name: 'Chill Stock', risk: 'low', returns: [0.05, 0.15], fail: 0.05 },
  { name: 'Crypto', risk: 'high', returns: [0.2, 0.8], fail: 0.35 },
  { name: 'Real Estate', risk: 'medium', returns: [0.1, 0.3], fail: 0.15 },
  { name: 'Startup', risk: 'extreme', returns: [0.5, 2.0], fail: 0.5 },
];

module.exports = {
  name: 'invest',
  aliases: ['investment'],
  category: 'Economy',
  description: 'Invest coins for potential returns',
  cooldown: 5,
  slashOptions: [
    { name: 'type', description: 'Investment type', type: 3, required: true, choices: INVESTMENTS.map(i => ({ name: `${i.name} (${i.risk} risk)`, value: i.name })) },
    { name: 'amount', description: 'Amount to invest', type: 4, required: true, min_value: 500 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('type'), interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0], parseInt(args[1]), client);
  },

  async _run(ctx, typeName, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    const inv = INVESTMENTS.find(i => i.name.toLowerCase() === typeName?.toLowerCase()) || INVESTMENTS[0];
    if (!amount || amount < 500) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Minimum investment is 500 coins. Types: \`${INVESTMENTS.map(i => i.name).join(', ')}\``))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - amount;
    const failed = Math.random() < inv.fail;
    if (failed) {
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📉 Investment Failed!\nYour **${inv.name}** investment failed!\nYou lost \`${formatNumber(amount)}\` coins.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
    const returnRate = inv.returns[0] + Math.random() * (inv.returns[1] - inv.returns[0]);
    const earned = Math.floor(amount * returnRate);
    eco.wallet = (eco.wallet || 0) + amount + earned;
    eco.totalEarned = (eco.totalEarned || 0) + earned;
    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📈 Investment Succeeded!\n**${inv.name}** returned \`${(returnRate * 100).toFixed(1)}%\`!\n**Profit:** \`+${formatNumber(earned)} coins\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
