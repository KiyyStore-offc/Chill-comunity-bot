const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'heist',
  aliases: ['bankheist', 'robbery'],
  category: 'Economy',
  description: 'Organize a bank heist with others for massive rewards',
  cooldown: 30,
  slashOptions: [{ name: 'amount', description: 'Amount to put in (min 500)', type: 4, required: true, min_value: 500 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, channel: interaction.channel, reply: async (o) => interaction.reply(o), fetchReply: () => interaction.fetchReply() }, interaction.options.getInteger('amount'), client, true);
  },
  async execute(message, args, client) {
    return this._run(message, parseInt(args[0]), client, false);
  },

  async _run(ctx, amount, client, isSlash) {
    const author = ctx.author || ctx.user;
    if (!amount || amount < 500) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Minimum heist entry is 500 coins.`))], flags: MessageFlags.IsComponentsV2 });
    const eco = getEcoData(client, author.id);
    if ((eco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(amount)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const joinBtn = new ButtonBuilder().setCustomId(`heist_join`).setLabel('Join Heist').setStyle(ButtonStyle.Success).setEmoji('🦹');
    const startBtn = new ButtonBuilder().setCustomId(`heist_start`).setLabel('Start Heist').setStyle(ButtonStyle.Danger).setEmoji('🔫');
    const row = new ActionRowBuilder().addComponents(joinBtn, startBtn);

    const participants = new Map();
    participants.set(author.id, amount);
    eco.wallet = (eco.wallet || 0) - amount;
    saveEcoData(client, author.id, eco);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🦹 Heist Initiated!\n**Organizer:** ${author.username}\n**Entry:** \`${formatNumber(amount)}\` coins\n**Participants:** 1\n\nOthers can join with the button below!\nHeist starts in 60 seconds or when organizer clicks Start.\n\n-# Chill Economy • Developed by AkiForver`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    const sent = isSlash ? await ctx.fetchReply().catch(() => null) : msg;
    if (!sent) return;

    const collector = sent.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (i) => {
      if (i.customId === 'heist_join') {
        if (participants.has(i.user.id)) return i.reply({ content: 'You already joined!', flags: 64 });
        const joinEco = getEcoData(client, i.user.id);
        if ((joinEco.wallet || 0) < amount) return i.reply({ content: `❌ You need \`${formatNumber(amount)}\` coins to join.`, flags: 64 });
        joinEco.wallet = (joinEco.wallet || 0) - amount;
        saveEcoData(client, i.user.id, joinEco);
        participants.set(i.user.id, amount);
        await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🦹 Heist — ${participants.size} Participants\n${[...participants.keys()].map(id => `<@${id}>`).join(', ')}\n\n-# Chill Economy`)).addSeparatorComponents(new SeparatorBuilder()).addActionRowComponents(row)], flags: MessageFlags.IsComponentsV2 });
        return;
      }
      if (i.customId === 'heist_start') {
        if (i.user.id !== author.id) return i.reply({ content: '❌ Only the organizer can start!', flags: 64 });
        collector.stop('start');
      }
    });

    collector.on('end', async (_, reason) => {
      const totalPot = [...participants.values()].reduce((a, b) => a + b, 0);
      const success = participants.size >= 2 ? Math.random() < 0.55 : Math.random() < 0.3;

      if (success) {
        const payout = Math.floor(totalPot * (1.5 + Math.random() * 1.5));
        const perPerson = Math.floor(payout / participants.size);
        for (const [uid] of participants) {
          const ue = getEcoData(client, uid);
          ue.wallet = (ue.wallet || 0) + perPerson;
          ue.totalEarned = (ue.totalEarned || 0) + perPerson;
          saveEcoData(client, uid, ue);
        }
        const names = [...participants.keys()].map(id => `<@${id}>`).join(', ');
        sent.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎉 Heist Successful!\n**Crew:** ${names}\n**Total Pot:** \`${formatNumber(totalPot)}\`\n**Each Earned:** \`+${formatNumber(perPerson)} coins\`\n\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      } else {
        const names = [...participants.keys()].map(id => `<@${id}>`).join(', ');
        sent.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🚔 Heist Failed!\n**Crew:** ${names}\nYou were all caught and lost your entry fees!\n\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
      }
    });
  }
};
