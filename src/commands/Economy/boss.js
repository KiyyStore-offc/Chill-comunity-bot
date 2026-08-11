const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, formatNumber } = require('../../utils/economyUtils.js');

const BOSS_CD = 7200000;
const BOSSES = [
  { name: '🐉 Ancient Dragon',   hp: 1000, power: [200, 800],  reward: [1000, 4000], xp: 150 },
  { name: '🧟 Undead King',      hp: 800,  power: [150, 600],  reward: [800,  3000], xp: 120 },
  { name: '👹 Demon Lord',       hp: 1200, power: [300, 1000], reward: [1500, 6000], xp: 200 },
  { name: '🤖 Rogue AI',         hp: 600,  power: [100, 500],  reward: [600,  2500], xp: 100 },
  { name: '🌊 Kraken',           hp: 900,  power: [200, 700],  reward: [900,  3500], xp: 130 },
  { name: '💀 Void Sorcerer',    hp: 1500, power: [400, 1200], reward: [2000, 8000], xp: 250 },
];

module.exports = {
  name: 'boss',
  aliases: ['bossfight', 'raid'],
  category: 'Economy',
  description: 'Fight a powerful boss every 2 hours for huge rewards',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);

    if (eco.lastBoss) {
      const diff = Date.now() - new Date(eco.lastBoss).getTime();
      if (diff < BOSS_CD) {
        const left = BOSS_CD - diff;
        const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
        return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🏥 Recovering from Boss Fight\nYou're still healing! Ready in \`${h}h ${m}m\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    }

    const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const level = eco.level || 1;
    const prestige = eco.prestige || 0;
    const playerPower = level * 30 + prestige * 100 + Math.floor(Math.random() * 200);
    const bossAttack = Math.floor(Math.random() * (boss.power[1] - boss.power[0] + 1)) + boss.power[0];

    eco.lastBoss = new Date().toISOString();

    const WIN_CHANCE = Math.min(0.75, 0.3 + (level * 0.02) + (prestige * 0.05));
    const won = Math.random() < WIN_CHANCE;

    const battleLog = [
      `⚔️ Your attack power: \`${playerPower}\``,
      `👊 Boss attack: \`${bossAttack}\``,
    ];

    if (won) {
      const reward = Math.floor(Math.random() * (boss.reward[1] - boss.reward[0] + 1)) + boss.reward[0];
      eco.wallet = (eco.wallet || 0) + reward;
      eco.totalEarned = (eco.totalEarned || 0) + reward;
      saveEcoData(client, userId, eco);
      const { leveled } = addXp(client, userId, boss.xp);
      client.db.transactions?.add(userId, 'boss', reward, `Defeated ${boss.name}`);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${boss.name} — DEFEATED! 🏆\n\n${battleLog.join('\n')}\n\n**You emerged victorious!**\n\n` +
        `> 💰 Reward: \`+${formatNumber(reward)}\` coins\n` +
        `> ⭐ XP: \`+${boss.xp}\`${leveled ? ' · **LEVEL UP!** 🎉' : ''}\n` +
        `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n*Fight again in **2 hours**!*\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    } else {
      const penalty = Math.min(Math.floor((eco.wallet || 0) * 0.1), bossAttack);
      eco.wallet = Math.max(0, (eco.wallet || 0) - penalty);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${boss.name} — DEFEATED YOU! 💀\n\n${battleLog.join('\n')}\n\n**You were overpowered!**\n\n` +
        `> 💸 Lost: \`${formatNumber(penalty)}\` coins in retreat\n` +
        `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n*Train more! Fight again in **2 hours**!*\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
