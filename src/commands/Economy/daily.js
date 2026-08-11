const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

const DAILY_COOLDOWN = 86400000;
const BASE_DAILY = 500;

module.exports = {
  name: 'daily',
  aliases: ['claim', 'dailyreward'],
  category: 'Economy',
  description: 'Claim your daily reward',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastDaily, DAILY_COOLDOWN);

    if (cd > 0) {
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.clock} Daily Already Claimed\nYou already claimed your daily reward!\n**Come back in:** \`${formatCooldown(cd)}\`\n\n-# Chill Economy`
        ));
      return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const streak = eco.dailyStreak || 0;
    const newStreak = streak + 1;
    const bonus = Math.min(newStreak * 50, 500);
    const amount = BASE_DAILY + bonus;

    eco.wallet = (eco.wallet || 0) + amount;
    eco.lastDaily = new Date().toISOString();
    eco.dailyStreak = newStreak;
    eco.totalEarned = (eco.totalEarned || 0) + amount;
    saveEcoData(client, userId, eco);
    const { leveled, eco: newEco } = addXp(client, userId, 50);

    client.db.transactions?.add(userId, 'daily', amount, 'Daily reward');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.coin} Daily Reward Claimed! 🎉\n` +
        `**+${formatNumber(amount)} coins** added to your wallet!\n\n` +
        `> 🔥 Streak: **${newStreak} day${newStreak !== 1 ? 's' : ''}**\n` +
        `> 💰 Base: \`${formatNumber(BASE_DAILY)}\` + Streak Bonus: \`${formatNumber(bonus)}\`\n` +
        `> 💛 New Balance: \`${formatNumber(eco.wallet)} coins\`\n` +
        (leveled ? `\n**🎉 Level Up! You are now Level ${newEco.level}!**\n` : '') +
        `\n-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
