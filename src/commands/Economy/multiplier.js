const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'multiplier',
  aliases: ['multi', 'boost', 'bonuses'],
  category: 'Economy',
  description: 'View all your active coin multipliers and bonuses',
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to check', type: 6, required: false }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const eco = getEcoData(client, target.id);
    const level = eco.level || 1;
    const prestige = eco.prestige || 0;
    const streak = eco.dailyStreak || 0;
    const marriage = client.db.marriage?.get(target.id);

    const mults = [];
    const baseWork = 1.0;
    const levelBonus = Math.min(level * 0.02, 1.0);
    const prestigeBonus = prestige * 0.10;
    const streakBonus = Math.min(streak * 0.01, 0.30);
    const marriageBonus = marriage ? 0.10 : 0;
    const total = baseWork + levelBonus + prestigeBonus + streakBonus + marriageBonus;

    mults.push(`🔷 **Base:**              \`×1.00\``);
    mults.push(`📶 **Level Bonus** (LVL ${level}): \`+${(levelBonus * 100).toFixed(0)}%\``);
    if (prestige > 0) mults.push(`🌟 **Prestige Bonus** (P${prestige}): \`+${(prestigeBonus * 100).toFixed(0)}%\``);
    if (streak > 0) mults.push(`🔥 **Streak Bonus** (${streak}d): \`+${(streakBonus * 100).toFixed(0)}%\``);
    if (marriage) mults.push(`💍 **Marriage Bonus:**  \`+10%\``);

    const upgrades = (() => { try { return JSON.parse(eco.upgrades || '[]'); } catch { return []; } })();
    if (upgrades.includes('work_boost')) mults.push(`⚙️ **Work Upgrade:**     \`+25%\``);
    if (upgrades.includes('luck_charm')) mults.push(`🍀 **Luck Charm:**       \`+15%\` (gambling)`);

    const workEarningsExample = Math.floor(400 * total);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚡ ${target.username}'s Multipliers\n\n` +
        mults.join('\n') +
        `\n\n**Total Work Multiplier:** \`×${total.toFixed(2)}\`\n` +
        `> Example: A 400 coin job → \`${formatNumber(workEarningsExample)}\` coins\n\n` +
        `-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
