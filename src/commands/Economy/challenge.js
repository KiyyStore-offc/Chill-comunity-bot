const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const GAMES = ['dice', 'coinflip', 'arm'];

module.exports = {
  name: 'challenge',
  aliases: ['bet2', 'wager'],
  category: 'Economy',
  description: 'Challenge someone to a mini-game wager',
  cooldown: 15,
  slashOptions: [
    { name: 'user', description: 'Who to challenge', type: 6, required: true },
    { name: 'amount', description: 'Coins to wager', type: 4, required: true, min_value: 10 },
    { name: 'game', description: 'Which game to play', type: 3, required: false, choices: [
      { name: '🎲 Dice Roll', value: 'dice' }, { name: '🪙 Coin Flip', value: 'coinflip' }, { name: '💪 Arm Wrestle', value: 'arm' }
    ]}
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) },
      interaction.options.getUser('user'), interaction.options.getInteger('amount'),
      interaction.options.getString('game') || 'dice', client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    const game = GAMES.includes(args[2]) ? args[2] : 'dice';
    return this._run(message, target, amount, game, client);
  },

  async _run(ctx, target, amount, game, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid user to challenge.'))], flags: MessageFlags.IsComponentsV2 });
    if (!amount || amount < 10)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum wager is **10** coins.'))], flags: MessageFlags.IsComponentsV2 });

    const myEco = getEcoData(client, author.id), theirEco = getEcoData(client, target.id);
    if ((myEco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You don't have \`${formatNumber(amount)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });
    if ((theirEco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${target.username}** doesn't have \`${formatNumber(amount)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const gameNames = { dice: '🎲 Dice Roll', coinflip: '🪙 Coin Flip', arm: '💪 Arm Wrestle' };
    const acceptBtn = new ButtonBuilder().setCustomId('ch_accept').setLabel('✅ Accept').setStyle(ButtonStyle.Success);
    const declineBtn = new ButtonBuilder().setCustomId('ch_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚡ Challenge Issued!\n**${author.username}** challenges **${target.username}** to **${gameNames[game]}**!\n\n> 💰 Wager: \`${formatNumber(amount)}\` coins\n> <@${target.id}> — 60 seconds to respond!`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) { await i.reply({ content: '❌ Not for you!', ephemeral: true }); return; }
      await i.deferUpdate(); collector.stop();

      if (i.customId === 'ch_decline') {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Challenge Declined\n**${target.username}** backed out.`))], flags: MessageFlags.IsComponentsV2 });
      }

      let myScore, theirScore, gameDesc;
      if (game === 'dice') {
        myScore = Math.floor(Math.random() * 6) + 1;
        theirScore = Math.floor(Math.random() * 6) + 1;
        gameDesc = `**${author.username}** rolled \`${myScore}\` · **${target.username}** rolled \`${theirScore}\``;
      } else if (game === 'coinflip') {
        myScore = Math.random() < 0.5 ? 1 : 0;
        theirScore = 1 - myScore;
        gameDesc = `**${author.username}** got \`${myScore ? 'Heads' : 'Tails'}\` · **${target.username}** got \`${theirScore ? 'Heads' : 'Tails'}\``;
      } else {
        myScore = Math.floor(Math.random() * 100) + 1;
        theirScore = Math.floor(Math.random() * 100) + 1;
        gameDesc = `**${author.username}** strength: \`${myScore}\` · **${target.username}** strength: \`${theirScore}\``;
      }

      if (myScore === theirScore) {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ↔️ It's a Tie!\n${gameDesc}\n\nNo coins exchanged.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
      }

      const winner = myScore > theirScore ? author : target;
      const loser = winner.id === author.id ? target : author;
      const wEco = getEcoData(client, winner.id), lEco = getEcoData(client, loser.id);
      wEco.wallet = (wEco.wallet || 0) + amount;
      wEco.totalEarned = (wEco.totalEarned || 0) + amount;
      lEco.wallet = Math.max(0, (lEco.wallet || 0) - amount);
      saveEcoData(client, winner.id, wEco); saveEcoData(client, loser.id, lEco);
      client.db.transactions?.add(winner.id, 'challenge', amount, `Won challenge vs ${loser.username}`);

      return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚡ Challenge Complete — ${gameNames[game]}\n\n${gameDesc}\n\n> 🏆 **${winner.username}** wins \`${formatNumber(amount)}\` coins!\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⏰ Challenge expired.'))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  }
};
