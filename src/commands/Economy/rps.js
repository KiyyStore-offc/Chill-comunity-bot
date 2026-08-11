const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const CHOICES = { rock: '🪨', paper: '📄', scissors: '✂️' };
const WINS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

module.exports = {
  name: 'rps',
  aliases: ['rockpaperscissors'],
  category: 'Economy',
  description: 'Play Rock Paper Scissors for coins',
  cooldown: 5,
  slashOptions: [
    { name: 'bet', description: 'Amount to bet', type: 4, required: true, min_value: 10 },
    { name: 'choice', description: 'Your choice', type: 3, required: true, choices: [{ name: '🪨 Rock', value: 'rock' }, { name: '📄 Paper', value: 'paper' }, { name: '✂️ Scissors', value: 'scissors' }] }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('bet'), interaction.options.getString('choice'), client);
  },
  async execute(message, args, client) { return this._run(message, parseInt(args[0]), args[1]?.toLowerCase(), client); },

  async _run(ctx, bet, choice, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!bet || bet < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Min bet is 10 coins.'))], flags: MessageFlags.IsComponentsV2 });
    if (!CHOICES[choice]) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Choose rock, paper, or scissors.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < bet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    const botChoice = Object.keys(CHOICES)[Math.floor(Math.random() * 3)];
    let result;
    if (choice === botChoice) result = 'tie';
    else if (WINS[choice] === botChoice) result = 'win';
    else result = 'lose';

    if (result === 'win') { eco.wallet = (eco.wallet || 0) + bet; eco.totalEarned = (eco.totalEarned || 0) + bet; }
    else if (result === 'lose') { eco.wallet = Math.max(0, (eco.wallet || 0) - bet); }
    saveEcoData(client, userId, eco);

    const resultText = result === 'win' ? `✅ **You Win! +${formatNumber(bet)} coins**` : result === 'lose' ? `❌ **You Lose! -${formatNumber(bet)} coins**` : `🤝 **Tie! Bet returned**`;
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✂️ Rock Paper Scissors!\n**You:** ${CHOICES[choice]} | **Bot:** ${CHOICES[botChoice]}\n\n${resultText}\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
