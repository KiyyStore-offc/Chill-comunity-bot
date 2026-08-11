const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'betall',
  aliases: ['allin', 'yolo', 'bankrupt'],
  category: 'Economy',
  description: 'Bet your entire wallet — double or nothing!',
  cooldown: 60,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const amount = eco.wallet || 0;

    if (amount < 10) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You need at least **10** coins in your wallet to go all-in!'))], flags: MessageFlags.IsComponentsV2 });

    const confirmBtn = new ButtonBuilder().setCustomId('ba_confirm').setLabel(`💀 Go ALL IN (${formatNumber(amount)} coins)`).setStyle(ButtonStyle.Danger);
    const cancelBtn = new ButtonBuilder().setCustomId('ba_cancel').setLabel('✋ Cancel').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 💀 ALL IN — Double or Nothing!\n\nYou're about to bet your **entire wallet**!\n\n> 💰 At stake: \`${formatNumber(amount)}\` coins\n> 🎲 Win chance: **50%**\n> 🏆 Win: **double** your wallet\n> 💀 Lose: lose **everything**\n\n**Are you absolutely sure?**`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) { await i.reply({ content: '❌ Not your game!', ephemeral: true }); return; }
      await i.deferUpdate(); collector.stop();

      if (i.customId === 'ba_cancel') {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ✋ Bet Cancelled\nWise choice — your coins are safe.\n-# Chill Economy'))], flags: MessageFlags.IsComponentsV2 });
      }

      const freshEco = getEcoData(client, userId);
      const bet = freshEco.wallet || 0;

      if (Math.random() < 0.5) {
        freshEco.wallet = bet * 2;
        freshEco.totalEarned = (freshEco.totalEarned || 0) + bet;
        saveEcoData(client, userId, freshEco);
        client.db.transactions?.add(userId, 'betall', bet, 'Won all-in bet');
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🎉 YOU WON!\n💰 **DOUBLED!** Your wallet went from \`${formatNumber(bet)}\` → \`${formatNumber(freshEco.wallet)}\`!\n\n-# Chill Economy — You madlad!`
        ))], flags: MessageFlags.IsComponentsV2 });
      } else {
        freshEco.wallet = 0;
        saveEcoData(client, userId, freshEco);
        client.db.transactions?.add(userId, 'betall', -bet, 'Lost all-in bet');
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 💀 YOU LOST EVERYTHING!\nYour wallet of \`${formatNumber(bet)}\` coins is **GONE**.\n\n> Start over with \`daily\`, \`work\`, or \`beg\`...\n-# Chill Economy — F in chat`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⏰ Bet expired — your coins are safe.'))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  }
};
