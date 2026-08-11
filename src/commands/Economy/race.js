const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const HORSES = [
  { name: 'Lightning', emoji: '⚡', odds: 2.0 },
  { name: 'Shadow', emoji: '🌑', odds: 3.0 },
  { name: 'Blaze', emoji: '🔥', odds: 2.5 },
  { name: 'Storm', emoji: '⛈️', odds: 4.0 },
  { name: 'Lucky Star', emoji: '⭐', odds: 6.0 },
];

module.exports = {
  name: 'race',
  aliases: ['horserace', 'horses'],
  category: 'Economy',
  description: 'Bet on a horse race',
  cooldown: 10,
  slashOptions: [
    { name: 'horse', description: 'Horse to bet on', type: 3, required: true, choices: HORSES.map(h => ({ name: `${h.emoji} ${h.name} (x${h.odds})`, value: h.name })) },
    { name: 'amount', description: 'Amount to bet', type: 4, required: true, min_value: 50 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('horse'), interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0], parseInt(args[1]), client); },

  async _run(ctx, horseName, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!horseName || !amount || amount < 50) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Usage: \`race <horse> <bet>\`. Horses: ${HORSES.map(h => h.name).join(', ')}`))] , flags: MessageFlags.IsComponentsV2 });
    const horse = HORSES.find(h => h.name.toLowerCase() === horseName.toLowerCase());
    if (!horse) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Unknown horse. Choose from: ${HORSES.map(h => h.name).join(', ')}`))], flags: MessageFlags.IsComponentsV2 });

    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(amount)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - amount;

    const winnerIdx = Math.floor(Math.random() * HORSES.length);
    const winner = HORSES[winnerIdx];
    const raceResults = HORSES.map((h, i) => `${h.emoji} ${h.name} — Position: **${i === winnerIdx ? '🥇 1st' : Math.floor(Math.random() * 4) + 2 + 'th'}**`).join('\n');

    if (winner.name === horse.name) {
      const prize = Math.floor(amount * horse.odds);
      eco.wallet = (eco.wallet || 0) + prize;
      eco.totalEarned = (eco.totalEarned || 0) + (prize - amount);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏇 Race Results!\n${raceResults}\n\n🏆 **${horse.emoji} ${horse.name} WON!** You won \`${formatNumber(prize)} coins\` (\`x${horse.odds}\`)!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    } else {
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🏇 Race Results!\n${raceResults}\n\n❌ **${winner.emoji} ${winner.name} won** — your pick **${horse.emoji} ${horse.name}** lost!\nYou lost \`${formatNumber(amount)} coins\`.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
