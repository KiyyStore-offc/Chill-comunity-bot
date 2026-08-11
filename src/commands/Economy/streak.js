const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'streak',
  aliases: ['streaks', 'mystreak'],
  category: 'Economy',
  description: 'View your daily/weekly streak info and bonuses',
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
    const dailyStreak = eco.dailyStreak || 0;
    const weeklyStreak = eco.weeklyStreak || 0;
    const dailyBonus = Math.min(dailyStreak * 50, 2500);
    const weeklyBonus = Math.min(weeklyStreak * 200, 5000);

    const bar = (n, max, filled = '█', empty = '░', size = 10) => {
      const pct = Math.min(n / max, 1);
      const f = Math.round(pct * size);
      return filled.repeat(f) + empty.repeat(size - f);
    };

    const DAILY_MAX = 30, WEEKLY_MAX = 12;
    const dBar = bar(dailyStreak, DAILY_MAX);
    const wBar = bar(weeklyStreak, WEEKLY_MAX);

    const milestones = [];
    if (dailyStreak >= 7) milestones.push('🔥 7-Day Warrior');
    if (dailyStreak >= 14) milestones.push('⚡ 14-Day Legend');
    if (dailyStreak >= 30) milestones.push('💎 30-Day Master');
    if (weeklyStreak >= 4) milestones.push('🏆 Monthly Champion');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔥 ${target.username}'s Streak Stats\n\n` +
        `**Daily Streak:** \`${dailyStreak}/${DAILY_MAX}\` days\n` +
        `\`\`\`${dBar}\`\`\`` +
        `> +\`${formatNumber(dailyBonus)}\` bonus per daily claim\n\n` +
        `**Weekly Streak:** \`${weeklyStreak}/${WEEKLY_MAX}\` weeks\n` +
        `\`\`\`${wBar}\`\`\`` +
        `> +\`${formatNumber(weeklyBonus)}\` bonus per weekly claim\n\n` +
        (milestones.length > 0 ? `**Milestones Unlocked:**\n${milestones.map(m => `> ${m}`).join('\n')}\n\n` : '') +
        `-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
