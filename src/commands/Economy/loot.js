const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const LOOT_CD = 3600000;
const LOOT_TABLES = {
  common:   { weight: 50, rewards: [{ type:'coins', min:100,  max:400  }, { type:'item', items:['Old Map','Torn Cloth','Rusty Coin','Pebble'] }] },
  uncommon: { weight: 30, rewards: [{ type:'coins', min:400,  max:1000 }, { type:'item', items:['Silver Key','Gem Shard','Lucky Dice','Strange Orb'] }] },
  rare:     { weight: 15, rewards: [{ type:'coins', min:1000, max:3000 }, { type:'item', items:['Dragon Scale','Crystal Ball','Phoenix Feather'] }] },
  epic:     { weight:  4, rewards: [{ type:'coins', min:3000, max:8000 }, { type:'item', items:['Void Stone','Mythic Relic','Ancient Scroll'] }] },
  legendary:{ weight:  1, rewards: [{ type:'coins', min:8000, max:20000 }, { type:'item', items:['Legendary Artifact','Time Jewel','Star Fragment'] }] },
};

function rollTier() {
  const roll = Math.random() * 100;
  let acc = 0;
  for (const [tier, data] of Object.entries(LOOT_TABLES)) {
    acc += data.weight;
    if (roll < acc) return tier;
  }
  return 'common';
}

const TIER_EMOJIS = { common:'⬜', uncommon:'🟢', rare:'🔵', epic:'🟣', legendary:'🟡' };

module.exports = {
  name: 'loot',
  aliases: ['lootbox', 'crate', 'chest'],
  category: 'Economy',
  description: 'Open a loot crate for random rewards every hour',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);

    if (eco.lastDungeon) {
      const diff = Date.now() - new Date(eco.lastDungeon).getTime();
      if (diff < LOOT_CD) {
        const left = LOOT_CD - diff;
        const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 📦 Loot Box Cooldown\nNext crate in: \`${m}m ${s}s\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    }

    const tier = rollTier();
    const tierData = LOOT_TABLES[tier];
    const coinReward = tierData.rewards[0];
    const coins = Math.floor(Math.random() * (coinReward.max - coinReward.min + 1)) + coinReward.min;
    const itemReward = tierData.rewards[1];
    const item = itemReward.items[Math.floor(Math.random() * itemReward.items.length)];

    eco.wallet = (eco.wallet || 0) + coins;
    eco.totalEarned = (eco.totalEarned || 0) + coins;
    eco.lastDungeon = new Date().toISOString();
    saveEcoData(client, userId, eco);
    client.db.inventory?.addItem(userId, { name: item, description: `${tier.charAt(0).toUpperCase()+tier.slice(1)} loot drop`, type: 'loot' });
    client.db.transactions?.add(userId, 'loot', coins, `Opened ${tier} loot crate`);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 📦 Loot Crate Opened!\n\n${TIER_EMOJIS[tier]} **${tier.toUpperCase()}** crate!\n\n` +
      `> 💰 Coins: \`+${formatNumber(coins)}\`\n` +
      `> 🎁 Item: **${item}** added to inventory!\n` +
      `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
      `*Next crate in **1 hour**!*\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
