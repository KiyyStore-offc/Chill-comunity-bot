const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const BEG_COOLDOWN = 900000;
const responses = [
  { success: true, msg: 'A kind stranger gave you some coins!', amount: [10, 80] },
  { success: true, msg: 'Someone took pity on you.', amount: [5, 50] },
  { success: true, msg: 'A wealthy user threw coins at you!', amount: [50, 200] },
  { success: false, msg: 'Nobody cared...', amount: 0 },
  { success: false, msg: 'You were ignored.', amount: 0 },
  { success: false, msg: 'Someone said "Get a job!"', amount: 0 },
];

module.exports = {
  name: 'beg',
  category: 'Economy',
  description: 'Beg for coins from generous strangers',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastBeg, BEG_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Cooldown\nWait before begging again!\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const response = responses[Math.floor(Math.random() * responses.length)];
    eco.lastBeg = new Date().toISOString();

    if (response.success && Array.isArray(response.amount)) {
      const earned = Math.floor(Math.random() * (response.amount[1] - response.amount[0] + 1)) + response.amount[0];
      eco.wallet = (eco.wallet || 0) + earned;
      eco.totalEarned = (eco.totalEarned || 0) + earned;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🙏 Begging...\n${response.msg}\n**Received:** \`+${formatNumber(earned)} coins\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🙏 Begging...\n${response.msg}\n> 👛 Wallet: \`${formatNumber(eco.wallet || 0)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
