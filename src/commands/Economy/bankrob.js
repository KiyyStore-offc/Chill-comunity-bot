const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const BANKROB_COOLDOWN = 28800000;
const SUCCESS_CHANCE = 0.3;

module.exports = {
  name: 'bankrob',
  aliases: ['robbank', 'heistbank'],
  category: 'Economy',
  description: 'Rob the Chill Bank for massive rewards (high risk!)',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastBankRob, BANKROB_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Laying Low\nPolice are watching you! Lay low.\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    eco.lastBankRob = new Date().toISOString();

    if (Math.random() < SUCCESS_CHANCE) {
      const stolen = Math.floor(Math.random() * 15000) + 5000;
      eco.wallet = (eco.wallet || 0) + stolen;
      eco.totalEarned = (eco.totalEarned || 0) + stolen;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏦 Bank Heist Successful!\nYou robbed the **Chill Bank** for \`${formatNumber(stolen)} coins\`!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    } else {
      const fine = Math.floor((eco.wallet || 0) * 0.4);
      eco.wallet = Math.max(0, (eco.wallet || 0) - fine);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🚔 Bank Robbery Failed!\nYou were arrested and fined \`${formatNumber(fine)} coins\`!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
