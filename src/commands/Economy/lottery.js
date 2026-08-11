const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const TICKET_PRICE = 200;
const JACKPOT_CHANCE = 0.005;
const PRIZE_TIERS = [
  { chance: 0.005, multiplier: 500, name: '💎 JACKPOT' },
  { chance: 0.02, multiplier: 50, name: '🥇 First Prize' },
  { chance: 0.05, multiplier: 20, name: '🥈 Second Prize' },
  { chance: 0.10, multiplier: 5, name: '🥉 Third Prize' },
  { chance: 0.20, multiplier: 2, name: '🎫 Small Win' },
];

module.exports = {
  name: 'lottery',
  aliases: ['lotto', 'ticket'],
  category: 'Economy',
  description: 'Buy a lottery ticket for a chance to win big',
  cooldown: 5,
  slashOptions: [{ name: 'tickets', description: 'How many tickets (1-10)', type: 4, required: false, min_value: 1, max_value: 10 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('tickets') || 1, client);
  },
  async execute(message, args, client) { return this._run(message, Math.min(10, Math.max(1, parseInt(args[0]) || 1)), client); },

  async _run(ctx, tickets, client) {
    const userId = (ctx.author || ctx.user).id;
    const cost = tickets * TICKET_PRICE;
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < cost) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ ${tickets} ticket(s) costs \`${formatNumber(cost)}\`. You have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });
    eco.wallet = (eco.wallet || 0) - cost;
    let totalWon = 0, results = '';

    for (let i = 0; i < tickets; i++) {
      const rand = Math.random();
      let cumulative = 0, won = false;
      for (const tier of PRIZE_TIERS) {
        cumulative += tier.chance;
        if (rand < cumulative) {
          const prize = TICKET_PRICE * tier.multiplier;
          totalWon += prize;
          results += `🎫 Ticket ${i + 1}: **${tier.name}** → \`+${formatNumber(prize)}\`\n`;
          won = true; break;
        }
      }
      if (!won) results += `🎫 Ticket ${i + 1}: No win\n`;
    }

    eco.wallet = (eco.wallet || 0) + totalWon;
    if (totalWon > 0) eco.totalEarned = (eco.totalEarned || 0) + totalWon;
    saveEcoData(client, userId, eco);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎰 Lottery Results (${tickets} ticket${tickets !== 1 ? 's' : ''})\n**Cost:** \`${formatNumber(cost)}\`\n\n${results}\n${totalWon > 0 ? `🎉 **Total Won: ${formatNumber(totalWon)} coins!**` : '😔 **No wins this time.**'}\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
