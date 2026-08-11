const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const MONTHLY_COOLDOWN = 2592000000;
const MONTHLY_AMOUNT = 25000;

module.exports = {
  name: 'monthly',
  aliases: ['monthlyclaim'],
  category: 'Economy',
  description: 'Claim your monthly reward',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastMonthly, MONTHLY_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Monthly Already Claimed!\n**Next in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = (eco.wallet || 0) + MONTHLY_AMOUNT;
    eco.totalEarned = (eco.totalEarned || 0) + MONTHLY_AMOUNT;
    eco.lastMonthly = new Date().toISOString();
    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎁 Monthly Reward!\n**+${formatNumber(MONTHLY_AMOUNT)} coins** added!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
