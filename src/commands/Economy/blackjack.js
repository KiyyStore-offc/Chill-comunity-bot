const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const CARDS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const SUITS = ['♠','♥','♦','♣'];
function drawCard() { return { value: CARDS[Math.floor(Math.random() * 13)], suit: SUITS[Math.floor(Math.random() * 4)] }; }
function cardValue(card) { if (['J','Q','K'].includes(card.value)) return 10; if (card.value === 'A') return 11; return parseInt(card.value); }
function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.value === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function formatHand(hand) { return hand.map(c => `\`${c.value}${c.suit}\``).join(' '); }

module.exports = {
  name: 'blackjack',
  aliases: ['bj', '21'],
  category: 'Economy',
  description: 'Play blackjack against the dealer',
  cooldown: 10,
  slashOptions: [{ name: 'amount', description: 'Amount to bet', type: 4, required: true, min_value: 10 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, parseInt(args[0]), client); },

  async _run(ctx, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!amount || amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum bet is 10 coins.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(amount)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - amount;
    saveEcoData(client, userId, eco);

    let playerHand = [drawCard(), drawCard()];
    let dealerHand = [drawCard(), drawCard()];
    let gameOver = false;

    const hitBtn = new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary).setEmoji('🃏');
    const standBtn = new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Secondary).setEmoji('🤚');
    const row = new ActionRowBuilder().addComponents(hitBtn, standBtn);

    const buildMessage = (over, result = '') => {
      const pv = handValue(playerHand), dv = handValue(dealerHand);
      const dealerDisplay = over ? formatHand(dealerHand) : `\`${dealerHand[0].value}${dealerHand[0].suit}\` \`?\``;
      return new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🃏 Blackjack — Bet: \`${formatNumber(amount)}\`\n` +
          `**Your Hand:** ${formatHand(playerHand)} — \`${pv}\`\n` +
          `**Dealer:** ${dealerDisplay}${over ? ` — \`${dv}\`` : ''}\n\n` +
          (result ? `**${result}**\n` : '') +
          (over ? `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n` : '') +
          `-# Chill Economy`
        ));
    };

    const endGame = async (i, result, payout) => {
      if (payout > 0) { eco.wallet = (eco.wallet || 0) + payout; eco.totalEarned = (eco.totalEarned || 0) + (payout - amount); }
      saveEcoData(client, userId, eco);
      const msg = buildMessage(true, result);
      await i.update({ components: [msg], flags: MessageFlags.IsComponentsV2 });
    };

    if (handValue(playerHand) === 21) {
      const payout = Math.floor(amount * 2.5);
      eco.wallet = (eco.wallet || 0) + payout;
      eco.totalEarned = (eco.totalEarned || 0) + (payout - amount);
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [buildMessage(true, `🎉 BLACKJACK! You win \`${formatNumber(payout)}\`!`)], flags: MessageFlags.IsComponentsV2 });
    }

    const sent = await ctx.reply({ components: [buildMessage(false).addActionRowComponents(row)], flags: MessageFlags.IsComponentsV2 });
    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== userId) return i.reply({ content: '❌ Not your game.', flags: 64 });
      if (i.customId === 'bj_hit') {
        playerHand.push(drawCard());
        const pv = handValue(playerHand);
        if (pv > 21) { return await endGame(i, '💥 Bust! You went over 21. You lose.', 0); }
        if (pv === 21) {
          while (handValue(dealerHand) < 17) dealerHand.push(drawCard());
          const dv = handValue(dealerHand);
          if (dv > 21 || pv > dv) return await endGame(i, `✅ You win \`${formatNumber(amount * 2)}\`!`, amount * 2);
          return await endGame(i, '❌ Dealer wins!', 0);
        }
        await i.update({ components: [buildMessage(false).addActionRowComponents(row)], flags: MessageFlags.IsComponentsV2 });
      } else if (i.customId === 'bj_stand') {
        while (handValue(dealerHand) < 17) dealerHand.push(drawCard());
        const pv = handValue(playerHand), dv = handValue(dealerHand);
        if (dv > 21 || pv > dv) return await endGame(i, `✅ You win \`${formatNumber(amount * 2)}\`!`, amount * 2);
        if (pv === dv) return await endGame(i, '🤝 Push! Bet returned.', amount);
        return await endGame(i, '❌ Dealer wins!', 0);
      }
    });
    collector.on('end', (_, reason) => { if (reason === 'time') sent.edit({ components: [buildMessage(true, '⏰ Game timed out.')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  }
};
