const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'coinflip',
  aliases: ['cf', 'flip'],
  category: 'Economy',
  description: 'Flip a coin and double or lose your bet',
  cooldown: 5,
  slashOptions: [
    { name: 'side', description: 'heads or tails', type: 3, required: true, choices: [{ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' }] },
    { name: 'amount', description: 'Amount to bet', type: 4, required: true, min_value: 10 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('side'), interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0]?.toLowerCase(), parseInt(args[1]), client);
  },

  async _run(ctx, side, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!side || !['heads', 'tails'].includes(side)) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Choose `heads` or `tails`.'))], flags: MessageFlags.IsComponentsV2 });
    if (!amount || amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum bet is 10 coins.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet || 0)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = result === side;
    const coin = result === 'heads' ? '🪙 Heads' : '🪙 Tails';
    if (win) {
      eco.wallet = (eco.wallet || 0) + amount;
      eco.totalEarned = (eco.totalEarned || 0) + amount;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🪙 Coin Flip — You Won!\n**Result:** ${coin}\nYou bet \`${side}\` and **won** \`+${formatNumber(amount)} coins\`!\n> 👛 **Wallet:** \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    } else {
      eco.wallet = Math.max(0, (eco.wallet || 0) - amount);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🪙 Coin Flip — You Lost!\n**Result:** ${coin}\nYou bet \`${side}\` and **lost** \`${formatNumber(amount)} coins\`.\n> 👛 **Wallet:** \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
