const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'highlow',
  aliases: ['hilo', 'hl'],
  category: 'Economy',
  description: 'Higher or lower card game',
  cooldown: 10,
  slashOptions: [{ name: 'amount', description: 'Coins to bet', type: 4, required: true, min_value: 10 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, parseInt(args[0]), client); },

  async _run(ctx, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!amount || amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum bet is **10** coins.'))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You only have \`${formatNumber(eco.wallet||0)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const currentCard = Math.floor(Math.random() * 13) + 1;
    const cardNames = { 1:'Ace', 11:'Jack', 12:'Queen', 13:'King' };
    const cardLabel = (n) => cardNames[n] || n.toString();
    const suits = ['♠️','♥️','♦️','♣️'];
    const suit = suits[Math.floor(Math.random() * suits.length)];

    const higherBtn = new ButtonBuilder().setCustomId('hl_high').setLabel('⬆️ Higher').setStyle(ButtonStyle.Primary);
    const lowerBtn = new ButtonBuilder().setCustomId('hl_low').setLabel('⬇️ Lower').setStyle(ButtonStyle.Danger);
    const sameBtn = new ButtonBuilder().setCustomId('hl_same').setLabel('↔️ Same').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(higherBtn, lowerBtn, sameBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🃏 Higher or Lower?\n\nCurrent card: **${cardLabel(currentCard)} ${suit}** (\`${currentCard}\`)\n\n> Bet: \`${formatNumber(amount)}\` coins\n> Will the next card be higher, lower, or the same?`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) { await i.reply({ content: '❌ This is not your game!', ephemeral: true }); return; }
      await i.deferUpdate();
      collector.stop();

      const nextCard = Math.floor(Math.random() * 13) + 1;
      const nextSuit = suits[Math.floor(Math.random() * suits.length)];
      let correct = false;
      if (i.customId === 'hl_high' && nextCard > currentCard) correct = true;
      else if (i.customId === 'hl_low' && nextCard < currentCard) correct = true;
      else if (i.customId === 'hl_same' && nextCard === currentCard) correct = true;

      if (correct) {
        const mult = i.customId === 'hl_same' ? 5 : 2;
        const won = Math.floor(amount * mult);
        eco.wallet = (eco.wallet || 0) + won;
        eco.totalEarned = (eco.totalEarned || 0) + won;
        saveEcoData(client, userId, eco);
        client.db.transactions?.add(userId, 'highlow', won, 'Won high-low game');
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ✅ Correct! 🃏\n**${cardLabel(currentCard)} ${suit}** → **${cardLabel(nextCard)} ${nextSuit}**\n\n> 💰 Won \`${formatNumber(won)}\` coins (${mult}x)!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      } else {
        eco.wallet = Math.max(0, (eco.wallet || 0) - amount);
        saveEcoData(client, userId, eco);
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ❌ Wrong! 🃏\n**${cardLabel(currentCard)} ${suit}** → **${cardLabel(nextCard)} ${nextSuit}**\n\n> Lost \`${formatNumber(amount)}\` coins.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⏰ Game expired!'))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  }
};
