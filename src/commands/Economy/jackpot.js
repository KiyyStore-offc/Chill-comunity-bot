const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const TICKET_PRICE = 500;
const WIN_CHANCE = 0.05;

module.exports = {
  name: 'jackpot',
  aliases: ['lottery2', 'megapot'],
  category: 'Economy',
  description: 'View and enter the server jackpot pool',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const guildId = ctx.guild.id;
    const userId = (ctx.author || ctx.user).id;
    const jp = client.db.jackpot?.get(guildId) || { pool: 0 };
    const eco = getEcoData(client, userId);

    let lastWinnerText = '';
    if (jp.lastWinner) {
      try {
        const lastWinnerName = (await ctx.guild?.members.fetch(jp.lastWinner).catch(() => null))?.user.username || 'Unknown';
        const winDate = jp.lastWin ? new Date(jp.lastWin).toLocaleDateString() : '';
        lastWinnerText = `\n> 🏆 Last winner: **${lastWinnerName}** (${winDate})`;
      } catch {}
    }

    const buyBtn = new ButtonBuilder().setCustomId('jp_buy').setLabel(`🎟️ Buy Ticket (${formatNumber(TICKET_PRICE)} coins)`).setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(buyBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🎰 Server Jackpot Pool\n\n` +
        `\`\`\`ansi\n\u001b[1;33m💰 Current Pool  \u001b[0m :: \u001b[1;37m${formatNumber(jp.pool || 0)} coins\u001b[0m\n\`\`\`` +
        `> 🎟️ Each ticket costs \`${formatNumber(TICKET_PRICE)}\` coins\n` +
        `> 🎲 Win chance: \`${(WIN_CHANCE * 100).toFixed(0)}%\` per ticket${lastWinnerText}\n\n` +
        `> 👛 Your wallet: \`${formatNumber(eco.wallet || 0)}\`\n-# Chill Economy`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) { await i.reply({ content: '❌ Not your jackpot panel!', ephemeral: true }); return; }
      await i.deferUpdate();
      collector.stop();

      const freshEco = getEcoData(client, userId);
      if ((freshEco.wallet || 0) < TICKET_PRICE) {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(TICKET_PRICE)}\` coins for a ticket.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
      }

      freshEco.wallet -= TICKET_PRICE;
      saveEcoData(client, userId, freshEco);
      client.db.jackpot?.add(guildId, TICKET_PRICE);
      const freshJp = client.db.jackpot?.get(guildId) || { pool: TICKET_PRICE };

      if (Math.random() < WIN_CHANCE) {
        const pool = freshJp.pool;
        const freshEco2 = getEcoData(client, userId);
        freshEco2.wallet = (freshEco2.wallet || 0) + pool;
        freshEco2.totalEarned = (freshEco2.totalEarned || 0) + pool;
        saveEcoData(client, userId, freshEco2);
        client.db.jackpot?.win(guildId, userId);
        client.db.transactions?.add(userId, 'jackpot_win', pool, 'Won server jackpot!');
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🎉 JACKPOT WIN!\nYou bought a ticket and won the entire pool!\n\n> 💰 Won: \`${formatNumber(pool)}\` coins!\n> 👛 Wallet: \`${formatNumber(freshEco2.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      } else {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🎟️ Ticket Purchased!\nNo win this time.\n\n> 💸 Spent: \`${formatNumber(TICKET_PRICE)}\`\n> 💰 Pool is now: \`${formatNumber(freshJp.pool)}\`\n> 👛 Wallet: \`${formatNumber(freshEco.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    });
  }
};
