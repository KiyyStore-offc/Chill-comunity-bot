const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'buy',
  aliases: ['purchase'],
  category: 'Economy',
  description: 'Buy an item from the server shop',
  cooldown: 5,
  slashOptions: [{ name: 'item', description: 'Item name to buy', type: 3, required: true }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, member: interaction.member, reply: async (o) => interaction.reply(o) }, interaction.options.getString('item'), client);
  },
  async execute(message, args, client) { return this._run(message, args.join(' '), client); },

  async _run(ctx, itemName, client) {
    if (!itemName) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Please provide an item name to buy.`))], flags: MessageFlags.IsComponentsV2 });
    const guildId = ctx.guild.id;
    const item = client.db.shop ? client.db.shop.getItem(guildId, itemName) : null;
    if (!item) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Item \`${itemName}\` not found. Use \`shop\` to see available items.`))], flags: MessageFlags.IsComponentsV2 });

    // Check stock
    if (item.quantity === 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${item.name}** is out of stock!`))], flags: MessageFlags.IsComponentsV2 });

    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    if ((eco.wallet || 0) < item.price) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(item.price)}\` coins but only have \`${formatNumber(eco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    eco.wallet = (eco.wallet || 0) - item.price;
    saveEcoData(client, userId, eco);

    // Decrement stock if not unlimited
    if (item.quantity !== -1) client.db.shop?.decrementStock(guildId, item.name);

    if (client.db.inventory) client.db.inventory.addItem(userId, { name: item.name, description: item.description, type: item.type });
    if (item.roleId && ctx.member) {
      try { await ctx.member.roles.add(item.roleId); } catch {}
    }
    client.db.transactions?.add(userId, 'buy', -item.price, `Bought ${item.name}`);

    const stockLeft = item.quantity === -1 ? '∞' : item.quantity - 1;
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ✅ Purchase Successful!\nYou bought **${item.name}** for \`${formatNumber(item.price)}\` coins!\n` +
      `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n` +
      `> 📦 Stock remaining: \`${stockLeft}\`\n` +
      `-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
