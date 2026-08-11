const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'duel',
  aliases: ['battle', 'pvp'],
  category: 'Economy',
  description: 'Challenge someone to a 1v1 coin duel',
  cooldown: 30,
  slashOptions: [
    { name: 'user', description: 'Who to duel', type: 6, required: true },
    { name: 'amount', description: 'Coins to bet', type: 4, required: true, min_value: 10 }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, target, amount, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    return this._run(message, target, amount, client);
  },

  async _run(ctx, target, amount, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid user to duel.'))], flags: MessageFlags.IsComponentsV2 });
    if (!amount || amount < 10)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Minimum duel amount is **10** coins.'))], flags: MessageFlags.IsComponentsV2 });

    const myEco = getEcoData(client, author.id);
    const theirEco = getEcoData(client, target.id);
    if ((myEco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You don't have enough coins. You have \`${formatNumber(myEco.wallet||0)}\`.`))], flags: MessageFlags.IsComponentsV2 });
    if ((theirEco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${target.username}** doesn't have enough coins to duel.`))], flags: MessageFlags.IsComponentsV2 });

    const acceptBtn = new ButtonBuilder().setCustomId('duel_accept').setLabel('⚔️ Accept').setStyle(ButtonStyle.Success);
    const declineBtn = new ButtonBuilder().setCustomId('duel_decline').setLabel('❌ Decline').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚔️ Duel Challenge!\n**${author.username}** has challenged **${target.username}** to a duel!\n\n> 💰 **Bet:** \`${formatNumber(amount)}\` coins each\n> Winner takes all!\n\n<@${target.id}>, you have **60 seconds** to accept.`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) { await i.reply({ content: '❌ This duel is not for you.', ephemeral: true }); return; }
      await i.deferUpdate();
      collector.stop();

      if (i.customId === 'duel_decline') {
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Duel Declined\n**${target.username}** backed down from the challenge.`));
        return msg.edit({ components: [done], flags: MessageFlags.IsComponentsV2 });
      }

      const myRoll = Math.floor(Math.random() * 100) + 1;
      const theirRoll = Math.floor(Math.random() * 100) + 1;
      const winner = myRoll > theirRoll ? author : theirRoll > myRoll ? target : null;

      if (winner) {
        const loser = winner.id === author.id ? target : author;
        const wEco = getEcoData(client, winner.id), lEco = getEcoData(client, loser.id);
        wEco.wallet = (wEco.wallet || 0) + amount;
        wEco.totalEarned = (wEco.totalEarned || 0) + amount;
        lEco.wallet = Math.max(0, (lEco.wallet || 0) - amount);
        saveEcoData(client, winner.id, wEco); saveEcoData(client, loser.id, lEco);
        client.db.transactions?.add(winner.id, 'duel', amount, `Won duel vs ${loser.username}`);
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⚔️ Duel Result!\n\n🎲 **${author.username}** rolled: \`${myRoll}\`\n🎲 **${target.username}** rolled: \`${theirRoll}\`\n\n🏆 **${winner.username}** wins \`${formatNumber(amount)}\` coins!\n-# Chill Economy`
        ));
        return msg.edit({ components: [done], flags: MessageFlags.IsComponentsV2 });
      } else {
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⚔️ Duel Result — TIE!\n\n🎲 Both rolled: \`${myRoll}\`\n\nIt's a tie! No coins exchanged.\n-# Chill Economy`
        ));
        return msg.edit({ components: [done], flags: MessageFlags.IsComponentsV2 });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Duel Expired\n**${target.username}** didn't respond in time.`));
        msg.edit({ components: [done], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });
  }
};
