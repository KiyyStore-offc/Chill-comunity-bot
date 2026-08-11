const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const SYMBOLS2 = ['💎', '🌟', '🔔', '🍀', '🎯', '❌'];
const PAYOUTS2 = { '💎': 50, '🌟': 20, '🔔': 10, '🍀': 5, '🎯': 3 };

module.exports = {
  name: 'scratch',
  aliases: ['scratchcard', 'scratchy'],
  category: 'Economy',
  description: 'Buy a scratch card for a chance to win big',
  cooldown: 5,
  slashOptions: [{ name: 'cards', description: 'How many cards (1-5)', type: 4, required: false, min_value: 1, max_value: 5 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('cards') || 1, client);
  },
  async execute(message, args, client) { return this._run(message, Math.min(5, Math.max(1, parseInt(args[0]) || 1)), client); },

  async _run(ctx, cards, client) {
    const userId = (ctx.author || ctx.user).id;
    const cost = cards * 100;
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < cost) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(cost)}\` coins for ${cards} card(s).`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - cost;
    let totalWon = 0;
    let results = '';

    for (let i = 0; i < cards; i++) {
      const row = [SYMBOLS2[Math.floor(Math.random() * SYMBOLS2.length)], SYMBOLS2[Math.floor(Math.random() * SYMBOLS2.length)], SYMBOLS2[Math.floor(Math.random() * SYMBOLS2.length)]];
      const winning = row[0] === row[1] && row[1] === row[2] && PAYOUTS2[row[0]];
      const prize = winning ? PAYOUTS2[row[0]] * 100 : 0;
      totalWon += prize;
      results += `Card ${i + 1}: ${row.join(' ')} ${winning ? `→ **+${formatNumber(prize)}**` : '→ No win'}\n`;
    }

    eco.wallet = (eco.wallet || 0) + totalWon;
    if (totalWon > 0) eco.totalEarned = (eco.totalEarned || 0) + totalWon;
    saveEcoData(client, userId, eco);

    const header = totalWon > 0 ? `🎉 You won **${formatNumber(totalWon)} coins**!` : '😔 Better luck next time!';
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎴 Scratch Cards (${cards}x)\n**Cost:** \`${formatNumber(cost)}\`\n\n${results}\n${header}\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
