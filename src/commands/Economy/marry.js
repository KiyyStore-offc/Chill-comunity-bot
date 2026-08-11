const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'marry',
  aliases: ['propose', 'wed'],
  category: 'Economy',
  description: 'Propose marriage to someone for economy bonuses',
  cooldown: 10,
  slashOptions: [{ name: 'user', description: 'Who to propose to', type: 6, required: true }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid user to propose to.'))], flags: MessageFlags.IsComponentsV2 });

    const myMarriage = client.db.marriage?.get(author.id);
    if (myMarriage) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You are already married to <@${myMarriage.partnerId}>! Use \`divorce\` first.`))], flags: MessageFlags.IsComponentsV2 });
    const theirMarriage = client.db.marriage?.get(target.id);
    if (theirMarriage) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${target.username}** is already married to someone else!`))], flags: MessageFlags.IsComponentsV2 });

    const acceptBtn = new ButtonBuilder().setCustomId('marry_accept').setLabel('💍 Accept').setStyle(ButtonStyle.Success);
    const declineBtn = new ButtonBuilder().setCustomId('marry_decline').setLabel('💔 Decline').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 💍 Marriage Proposal!\n**${author.username}** is proposing to **${target.username}**!\n\n> Married couples receive bonus coins on daily rewards!\n\n<@${target.id}>, do you accept?`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) { await i.reply({ content: '❌ This proposal is not for you!', ephemeral: true }); return; }
      await i.deferUpdate();
      collector.stop();

      if (i.customId === 'marry_accept') {
        client.db.marriage?.set(author.id, target.id);
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 💍 Married!\n**${author.username}** and **${target.username}** are now married! 🎉\n\nYou'll receive **+10% bonus** on daily rewards!\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      } else {
        return msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 💔 Proposal Declined\n**${target.username}** declined the proposal.\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('### ⏰ Proposal expired — no response.'))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  }
};
