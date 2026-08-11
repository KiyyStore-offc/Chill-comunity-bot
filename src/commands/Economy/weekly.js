const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const WEEKLY_COOLDOWN = 604800000;
const WEEKLY_AMOUNT = 5000;

module.exports = {
  name: 'weekly',
  aliases: ['weeklyclaim', 'weeklyreward'],
  category: 'Economy',
  description: 'Claim your weekly reward',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastWeekly, WEEKLY_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Weekly Already Claimed!\n**Next in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = (eco.wallet || 0) + WEEKLY_AMOUNT;
    eco.totalEarned = (eco.totalEarned || 0) + WEEKLY_AMOUNT;
    eco.lastWeekly = new Date().toISOString();
    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎁 Weekly Reward!\n**+${formatNumber(WEEKLY_AMOUNT)} coins** added!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
