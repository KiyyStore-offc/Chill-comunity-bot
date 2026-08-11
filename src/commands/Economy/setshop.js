const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'setshop',
  aliases: ['addshop', 'shopmanage'],
  category: 'Economy',
  description: 'Manage the server shop (Admin)',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'add or remove', type: 3, required: true, choices: [{ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }] },
    { name: 'name', description: 'Item name', type: 3, required: true },
    { name: 'price', description: 'Item price (for add)', type: 4, required: false, min_value: 1 },
    { name: 'quantity', description: 'Stock quantity (-1 = unlimited)', type: 4, required: false, min_value: -1 },
    { name: 'description', description: 'Item description', type: 3, required: false },
    { name: 'role', description: 'Role to give on purchase', type: 8, required: false }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action');
    const name = interaction.options.getString('name');
    const price = interaction.options.getInteger('price');
    const quantity = interaction.options.getInteger('quantity') ?? -1;
    const description = interaction.options.getString('description');
    const role = interaction.options.getRole('role');
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, action, name, price, quantity, description, role?.id, client);
  },
  async execute(message, args, client) {
    const action = args[0]?.toLowerCase();
    const name = args[1];
    const price = parseInt(args[2]);
    const quantity = parseInt(args[3]) || -1;
    return this._run(message, action, name, price, quantity, args.slice(4).join(' '), null, client);
  },

  async _run(ctx, action, name, price, quantity, description, roleId, client) {
    const guildId = ctx.guild.id;
    if (!action || !name) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `❌ **Usage:**\n\`setshop add <name> <price> [quantity] [description]\`\n\`setshop remove <name>\`\n\n> Quantity \`-1\` = unlimited stock`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'add') {
      if (!price || price < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Please provide a valid price.`))], flags: MessageFlags.IsComponentsV2 });
      const qty = (quantity == null || isNaN(quantity)) ? -1 : quantity;
      if (client.db.shop) client.db.shop.add(guildId, { name, price, description: description || '', roleId, quantity: qty });
      const stockText = qty === -1 ? '∞ Unlimited' : `${qty} in stock`;
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ✅ Item Added to Shop\n` +
        `**Name:** ${name}\n` +
        `**Price:** \`${formatNumber(price)}\` coins\n` +
        `**Stock:** \`${stockText}\`\n` +
        `${description ? `**Desc:** ${description}\n` : ''}` +
        `${roleId ? `**Role:** <@&${roleId}>\n` : ''}` +
        `\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'remove') {
      if (client.db.shop) client.db.shop.remove(guildId, name);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ✅ Item Removed\n**${name}** has been removed from the shop.\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
