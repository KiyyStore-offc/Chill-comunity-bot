const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'income',
  aliases: ['passive', 'earnings'],
  category: 'Economy',
  description: 'View your passive income sources and economy stats',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const prestigeBonus = (eco.prestige || 0) * 10;
    const baseDaily = 500, baseWork = 450, baseWeekly = 5000;
    const totalDaily = Math.floor(baseDaily * (1 + prestigeBonus / 100));
    const totalWork = Math.floor(baseWork * (1 + prestigeBonus / 100));
    const totalWeekly = Math.floor(baseWeekly * (1 + prestigeBonus / 100));

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 💵 Income Overview\n` +
        `**Prestige Bonus:** \`+${prestigeBonus}%\` to all earnings\n\n` +
        `**Daily Reward:** \`${formatNumber(totalDaily)}\` coins/day\n` +
        `**Work:** \`${formatNumber(totalWork)}\` avg coins/hr\n` +
        `**Weekly:** \`${formatNumber(totalWeekly)}\` coins/week\n\n` +
        `**Total Earned (lifetime):** \`${formatNumber(eco.totalEarned || 0)}\`\n` +
        `**Current Net Worth:** \`${formatNumber((eco.wallet || 0) + (eco.bank || 0))}\`\n\n` +
        `-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
