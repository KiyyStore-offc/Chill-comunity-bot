const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'trade',
  aliases: ['barter', 'exchange'],
  category: 'Economy',
  description: 'Trade items with another user',
  cooldown: 10,
  slashOptions: [
    { name: 'user', description: 'User to trade with', type: 6, required: true },
    { name: 'offer_item', description: 'Item you offer from inventory', type: 3, required: true },
    { name: 'request_item', description: 'Item you want from them', type: 3, required: true }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, channel: interaction.channel, reply: async (o) => interaction.reply(o) }, interaction.options.getUser('user'), interaction.options.getString('offer_item'), interaction.options.getString('request_item'), client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    return this._run(message, target, args[1], args[2], client);
  },

  async _run(ctx, target, offerItem, requestItem, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid user to trade with.'))], flags: MessageFlags.IsComponentsV2 });
    if (!offerItem || !requestItem) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Provide both offer and request items.'))], flags: MessageFlags.IsComponentsV2 });

    const myItems = client.db.inventory ? client.db.inventory.get(author.id) : [];
    const theirItems = client.db.inventory ? client.db.inventory.get(target.id) : [];
    const myItem = myItems.find(i => i.name?.toLowerCase() === offerItem.toLowerCase());
    const theirItem = theirItems.find(i => i.name?.toLowerCase() === requestItem.toLowerCase());

    if (!myItem) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You don't have **${offerItem}** in your inventory.`))], flags: MessageFlags.IsComponentsV2 });
    if (!theirItem) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${target.username}** doesn't have **${requestItem}**.`))], flags: MessageFlags.IsComponentsV2 });

    const acceptBtn = new ButtonBuilder().setCustomId(`trade_accept_${author.id}`).setLabel('Accept Trade').setStyle(ButtonStyle.Success);
    const denyBtn = new ButtonBuilder().setCustomId(`trade_deny_${author.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(acceptBtn, denyBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔄 Trade Request\n<@${target.id}>, **${author.username}** wants to trade!\n\n` +
        `**They Offer:** \`${offerItem}\`\n**They Want:** \`${requestItem}\`\n\n` +
        `*<@${target.id}> — Accept or decline within 30 seconds.*\n-# Chill Economy`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== target.id) return i.reply({ content: '❌ Only the trade recipient can respond.', flags: 64 });

      if (i.customId.startsWith('trade_deny')) {
        return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Trade Declined\n**${target.username}** declined the trade.`))], flags: MessageFlags.IsComponentsV2 });
      }

      // Swap items
      if (client.db.inventory) {
        client.db.inventory.removeItem(author.id, offerItem);
        client.db.inventory.addItem(author.id, theirItem);
        client.db.inventory.removeItem(target.id, requestItem);
        client.db.inventory.addItem(target.id, myItem);
      }
      await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Trade Complete!\n**${author.username}** gave \`${offerItem}\` → **${target.username}** gave \`${requestItem}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
  }
};
