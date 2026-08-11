const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const FISH_COOLDOWN = 1800000;
const catches = [
  { name: 'Old Boot', value: 0, emoji: '👢', rarity: 'trash' },
  { name: 'Small Fish', value: [20, 60], emoji: '🐟', rarity: 'common' },
  { name: 'Salmon', value: [80, 150], emoji: '🐠', rarity: 'uncommon' },
  { name: 'Big Bass', value: [150, 300], emoji: '🦈', rarity: 'rare' },
  { name: 'Golden Fish', value: [500, 1000], emoji: '🌟', rarity: 'legendary' },
  { name: 'Treasure Chest', value: [800, 2000], emoji: '🪙', rarity: 'legendary' },
];

module.exports = {
  name: 'fish',
  aliases: ['fishing', 'cast'],
  category: 'Economy',
  description: 'Go fishing and earn coins',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastFish, FISH_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Fishing Cooldown\nYour fishing rod needs rest!\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const rand = Math.random();
    let catch_ = catches[0];
    if (rand < 0.02) catch_ = catches[5];
    else if (rand < 0.07) catch_ = catches[4];
    else if (rand < 0.20) catch_ = catches[3];
    else if (rand < 0.45) catch_ = catches[2];
    else if (rand < 0.85) catch_ = catches[1];

    eco.lastFish = new Date().toISOString();
    let earned = 0;
    let msg;
    if (Array.isArray(catch_.value)) {
      earned = Math.floor(Math.random() * (catch_.value[1] - catch_.value[0] + 1)) + catch_.value[0];
      eco.wallet = (eco.wallet || 0) + earned;
      eco.totalEarned = (eco.totalEarned || 0) + earned;
      msg = `### ${catch_.emoji} You Caught a ${catch_.name}!\n**Earned:** \`+${formatNumber(earned)} coins\`\n> 🎣 Rarity: \`${catch_.rarity.toUpperCase()}\` | 👛 Wallet: \`${formatNumber(eco.wallet)}\``;
    } else {
      msg = `### ${catch_.emoji} You Caught an Old Boot...\nBetter luck next time! Nothing earned.\n> 👛 Wallet: \`${formatNumber(eco.wallet || 0)}\``;
    }
    saveEcoData(client, userId, eco);
    addXp(client, userId, 20);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(msg + '\n-# Chill Economy'))], flags: MessageFlags.IsComponentsV2 });
  }
};
