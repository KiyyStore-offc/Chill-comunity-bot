const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const MINE_COOLDOWN = 2700000;
const ores = [
  { name: 'Stone', value: [5, 20], emoji: '🪨', rarity: 'common' },
  { name: 'Coal', value: [30, 70], emoji: '⚫', rarity: 'common' },
  { name: 'Iron', value: [80, 150], emoji: '⚙️', rarity: 'uncommon' },
  { name: 'Gold', value: [200, 400], emoji: '🥇', rarity: 'rare' },
  { name: 'Diamond', value: [600, 1200], emoji: '💎', rarity: 'epic' },
  { name: 'Chill Crystal', value: [1500, 3000], emoji: '🌸', rarity: 'legendary' },
];

module.exports = {
  name: 'mine',
  aliases: ['mining', 'dig'],
  category: 'Economy',
  description: 'Mine for ores and earn coins',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastMine, MINE_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Mining Cooldown\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const rand = Math.random();
    let ore;
    if (rand < 0.01) ore = ores[5];
    else if (rand < 0.06) ore = ores[4];
    else if (rand < 0.18) ore = ores[3];
    else if (rand < 0.40) ore = ores[2];
    else if (rand < 0.70) ore = ores[1];
    else ore = ores[0];

    const earned = Math.floor(Math.random() * (ore.value[1] - ore.value[0] + 1)) + ore.value[0];
    eco.wallet = (eco.wallet || 0) + earned;
    eco.totalEarned = (eco.totalEarned || 0) + earned;
    eco.lastMine = new Date().toISOString();
    saveEcoData(client, userId, eco);
    addXp(client, userId, 25);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⛏️ Mining Complete!\nYou found **${ore.emoji} ${ore.name}**!\n**Earned:** \`+${formatNumber(earned)} coins\`\n> 🏷️ Rarity: \`${ore.rarity.toUpperCase()}\` | 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
