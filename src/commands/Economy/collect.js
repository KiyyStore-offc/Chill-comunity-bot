const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const COLLECT_CD = 3600000;

module.exports = {
  name: 'collect',
  aliases: ['hourly'],
  category: 'Economy',
  description: 'Collect hourly passive income based on your level',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const lastCollect = eco.lastCollect;

    if (lastCollect) {
      const diff = Date.now() - new Date(lastCollect).getTime();
      if (diff < COLLECT_CD) {
        const left = COLLECT_CD - diff;
        const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⏰ Passive Income Cooldown\nYou can collect again in \`${m}m ${s}s\`!\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    }

    const level = eco.level || 1;
    const prestige = eco.prestige || 0;
    const base = 50 * level + prestige * 100;
    const bonus = Math.floor(Math.random() * (level * 10));
    const earned = base + bonus;

    eco.wallet = (eco.wallet || 0) + earned;
    eco.totalEarned = (eco.totalEarned || 0) + earned;
    eco.lastCollect = new Date().toISOString();
    saveEcoData(client, userId, eco);
    client.db.transactions?.add(userId, 'collect', earned, 'Collected passive income');

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 💼 Passive Income Collected!\n\n> 📶 Level: \`${level}\` · 🌟 Prestige: \`${prestige}\`\n> 💰 Earned: \`+${formatNumber(earned)}\` coins\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n*Collect again in **1 hour**!*\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
