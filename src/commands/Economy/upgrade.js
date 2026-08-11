const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const UPGRADES = [
  { id: 'pickaxe', name: '⛏️ Pickaxe', desc: '+50% mining income', cost: 5000, type: 'mine', bonus: 0.5 },
  { id: 'fishing_rod', name: '🎣 Pro Rod', desc: '+50% fishing income', cost: 5000, type: 'fish', bonus: 0.5 },
  { id: 'bow', name: '🏹 Hunting Bow', desc: '+50% hunting income', cost: 5000, type: 'hunt', bonus: 0.5 },
  { id: 'lucky_charm', name: '🍀 Lucky Charm', desc: '+10% gamble win chance', cost: 10000, type: 'gamble', bonus: 0.1 },
  { id: 'briefcase', name: '💼 Briefcase', desc: '+30% work income', cost: 8000, type: 'work', bonus: 0.3 },
];

module.exports = {
  name: 'upgrade',
  aliases: ['upgrades', 'buy_upgrade'],
  category: 'Economy',
  description: 'Upgrade your tools for better income',
  cooldown: 5,
  slashOptions: [{ name: 'upgrade', description: 'Upgrade to buy', type: 3, required: false, choices: UPGRADES.map(u => ({ name: u.name, value: u.id })) }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('upgrade'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0], client); },

  async _run(ctx, upgradeId, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const owned = eco.upgrades || [];

    if (!upgradeId) {
      const list = UPGRADES.map(u => `${owned.includes(u.id) ? '✅' : '⬜'} **${u.name}** — \`${formatNumber(u.cost)}\` coins\n  *${u.desc}*`).join('\n');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔧 Upgrade Shop\nUse \`upgrade <name>\` to buy!\n\n${list}\n\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    const upg = UPGRADES.find(u => u.id === upgradeId);
    if (!upg) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Invalid upgrade.'))], flags: MessageFlags.IsComponentsV2 });
    if (owned.includes(upg.id)) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ You already own **${upg.name}**!`))], flags: MessageFlags.IsComponentsV2 });
    if ((eco.wallet || 0) < upg.cost) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(upg.cost)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - upg.cost;
    eco.upgrades = [...owned, upg.id];
    saveEcoData(client, userId, eco);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Upgrade Purchased!\n**${upg.name}** is now active!\n*${upg.desc}*\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
