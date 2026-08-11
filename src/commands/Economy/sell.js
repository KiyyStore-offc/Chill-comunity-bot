const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'sell',
  aliases: ['sellitem'],
  category: 'Economy',
  description: 'Sell an item from your inventory',
  cooldown: 5,
  slashOptions: [
    { name: 'item', description: 'Item to sell', type: 3, required: true },
    { name: 'amount', description: 'How many to sell (default: 1)', type: 4, required: false, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getString('item'), interaction.options.getInteger('amount') || 1, client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0], parseInt(args[1]) || 1, client);
  },

  async _run(ctx, itemName, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!itemName) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide an item name.'))], flags: MessageFlags.IsComponentsV2 });

    const items = client.db.inventory ? client.db.inventory.get(userId) : [];
    const matchingItems = items.filter(i => i.name?.toLowerCase() === itemName.toLowerCase());
    if (matchingItems.length === 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You don't have **${itemName}** in your inventory.`))], flags: MessageFlags.IsComponentsV2 });

    const sellCount = Math.min(amount, matchingItems.length);
    const shopItem = client.db.shop ? client.db.shop.getItem(ctx.guild.id, itemName) : null;
    const sellPrice = shopItem ? Math.floor(shopItem.price * 0.5) : 50;
    const totalEarned = sellPrice * sellCount;

    let remaining = items.slice();
    let removed = 0;
    remaining = remaining.filter(i => {
      if (i.name?.toLowerCase() === itemName.toLowerCase() && removed < sellCount) { removed++; return false; }
      return true;
    });
    if (client.db.inventory) client.db.inventory.set(userId, remaining);

    const eco = getEcoData(client, userId);
    eco.wallet = (eco.wallet || 0) + totalEarned;
    eco.totalEarned = (eco.totalEarned || 0) + totalEarned;
    saveEcoData(client, userId, eco);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Item Sold!\nSold **${sellCount}x ${itemName}** for \`${formatNumber(totalEarned)} coins\`.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
