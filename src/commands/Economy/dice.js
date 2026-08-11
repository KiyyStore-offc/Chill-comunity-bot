const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'dice',
  aliases: ['diceroll', 'rolldice'],
  category: 'Economy',
  description: 'Roll dice and bet on the outcome',
  cooldown: 5,
  slashOptions: [
    { name: 'amount', description: 'Amount to bet', type: 4, required: true, min_value: 10 },
    { name: 'guess', description: 'Guess: high (4-6) or low (1-3)', type: 3, required: true, choices: [{ name: 'High (4-6)', value: 'high' }, { name: 'Low (1-3)', value: 'low' }] }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('amount'), interaction.options.getString('guess'), client);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]), args[1]?.toLowerCase(), client);
  },

  async _run(ctx, amount, guess, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!amount || amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Min bet is 10 coins.'))], flags: MessageFlags.IsComponentsV2 });
    if (!guess || !['high', 'low'].includes(guess)) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Guess must be `high` or `low`.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    const roll = Math.floor(Math.random() * 6) + 1;
    const rollEmoji = ['⚀','⚁','⚂','⚃','⚄','⚅'][roll - 1];
    const isHigh = roll >= 4;
    const win = (guess === 'high' && isHigh) || (guess === 'low' && !isHigh);

    if (win) {
      eco.wallet = (eco.wallet || 0) + amount;
      eco.totalEarned = (eco.totalEarned || 0) + amount;
    } else {
      eco.wallet = Math.max(0, (eco.wallet || 0) - amount);
    }
    saveEcoData(client, userId, eco);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎲 Dice Roll!\n**Roll:** ${rollEmoji} (\`${roll}\`) — **${isHigh ? 'HIGH' : 'LOW'}**\n**Your Guess:** \`${guess.toUpperCase()}\`\n${win ? `✅ **You won \`+${formatNumber(amount)}\` coins!**` : `❌ **You lost \`${formatNumber(amount)}\` coins.**`}\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
