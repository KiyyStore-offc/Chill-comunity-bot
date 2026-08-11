const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, addXp, formatNumber } = require('../../utils/economyUtils.js');

const EXPLORE_CD = 1800000;
const ZONES = [
  { name: '🏔️ Mountain Peak',    events: ['found a chest of gold', 'slipped and found gems', 'discovered ancient ruins', 'fought a mountain troll'],  minCoins: 200, maxCoins: 600, xp: 40 },
  { name: '🌊 Deep Ocean',        events: ['dove deep and found treasure', 'netted rare fish', 'discovered sunken ship', 'found magical pearls'],       minCoins: 300, maxCoins: 800, xp: 50 },
  { name: '🌲 Enchanted Forest',  events: ['found elven treasure', 'harvested rare herbs worth coins', 'discovered fairy gold', 'sold magic mushrooms'], minCoins: 150, maxCoins: 500, xp: 30 },
  { name: '🏜️ Desert Ruins',      events: ['found a pharaoh\'s treasure', 'dug up old gold coins', 'looted ancient pyramid', 'found oasis gems'],       minCoins: 250, maxCoins: 700, xp: 45 },
  { name: '🌋 Volcano Depths',    events: ['mined fire gems', 'found heat-forged gold', 'discovered dragon hoard', 'grabbed lava pearls'],              minCoins: 400, maxCoins: 1200, xp: 60 },
  { name: '🌌 Astral Realm',      events: ['collected star dust coins', 'found a void crystal', 'traded with cosmic beings', 'looted nebula fragments'], minCoins: 500, maxCoins: 1500, xp: 75 },
];

module.exports = {
  name: 'explore',
  aliases: ['adventure', 'expedition'],
  category: 'Economy',
  description: 'Explore a zone for loot every 30 minutes',
  cooldown: 5,
  slashOptions: [{ name: 'zone', description: 'Zone number (1-6) or leave blank for random', type: 4, required: false, min_value: 1, max_value: 6 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('zone') || 0, client);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]) || 0, client);
  },

  async _run(ctx, zoneNum, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);

    if (eco.lastExplore) {
      const diff = Date.now() - new Date(eco.lastExplore).getTime();
      if (diff < EXPLORE_CD) {
        const left = EXPLORE_CD - diff;
        const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⏰ Exploring Cooldown\nYou're still recovering! Ready in \`${m}m ${s}s\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    }

    const zone = zoneNum && zoneNum >= 1 && zoneNum <= 6 ? ZONES[zoneNum - 1] : ZONES[Math.floor(Math.random() * ZONES.length)];
    const event = zone.events[Math.floor(Math.random() * zone.events.length)];
    const coins = Math.floor(Math.random() * (zone.maxCoins - zone.minCoins + 1)) + zone.minCoins;

    const FAIL_CHANCE = 0.15;
    const failed = Math.random() < FAIL_CHANCE;

    eco.lastExplore = new Date().toISOString();

    if (failed) {
      const fine = Math.floor(coins * 0.3);
      eco.wallet = Math.max(0, (eco.wallet || 0) - fine);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${zone.name} — Exploration\n\nYou explored **${zone.name}** but encountered danger!\nYou escaped but lost supplies worth \`${formatNumber(fine)}\` coins.\n\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n*Explore again in **30 minutes**!*\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    eco.wallet = (eco.wallet || 0) + coins;
    eco.totalEarned = (eco.totalEarned || 0) + coins;
    saveEcoData(client, userId, eco);
    const { leveled } = addXp(client, userId, zone.xp);
    client.db.transactions?.add(userId, 'explore', coins, `Explored ${zone.name}`);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ${zone.name} — Exploration!\n\nYou explored **${zone.name}** and ${event}!\n\n` +
      `> 💰 Found: \`+${formatNumber(coins)}\` coins\n` +
      `> ⭐ XP: \`+${zone.xp}\`${leveled ? ' · **LEVEL UP!**' : ''}\n` +
      `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
      `*Explore again in **30 minutes**!*\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
