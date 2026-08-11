const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'restock',
  aliases: ['shopstock', 'addstock'],
  category: 'Economy',
  description: 'Admin: Restock a shop item\'s quantity',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    { name: 'item', description: 'Item name to restock', type: 3, required: true },
    { name: 'quantity', description: 'New stock quantity (-1 = unlimited)', type: 4, required: true, min_value: -1 }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, interaction.options.getString('item'), interaction.options.getInteger('quantity'), client);
  },
  async execute(message, args, client) {
    return this._run(message, args[0], parseInt(args[1]), client);
  },

  async _run(ctx, itemName, quantity, client) {
    if (!itemName) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Usage: `restock <item name> <quantity>`'))], flags: MessageFlags.IsComponentsV2 });
    if (quantity == null || isNaN(quantity)) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please provide a valid quantity. Use `-1` for unlimited.'))], flags: MessageFlags.IsComponentsV2 });

    const guildId = ctx.guild.id;
    const item = client.db.shop?.getItem(guildId, itemName);
    if (!item) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Item \`${itemName}\` not found in shop.`))], flags: MessageFlags.IsComponentsV2 });

    client.db.shop?.restock(guildId, itemName, quantity);
    const stockLabel = quantity === -1 ? '∞ Unlimited' : `${quantity}`;

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ✅ Shop Restocked!\n**${item.name}** stock updated.\n\n> 📦 New stock: \`${stockLabel}\`\n> 💰 Price: \`${formatNumber(item.price)}\` coins\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
