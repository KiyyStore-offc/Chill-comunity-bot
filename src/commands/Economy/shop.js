const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'shop',
  aliases: ['store', 'market'],
  category: 'Economy',
  description: 'Browse the server shop',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const guildId = ctx.guild.id;
    const items = client.db.shop ? client.db.shop.get(guildId) : [];

    if (!items || items.length === 0) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🛒 Server Shop\nThis server has no items yet!\n\nAdmins can add items using \`setshop add <name> <price> [quantity]\`.\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    const itemList = items.map((item, i) => {
      const stock = item.quantity === -1 ? '∞' : item.quantity <= 0 ? '**OUT OF STOCK**' : `${item.quantity}`;
      const stockTag = item.quantity === -1 ? '' : ` · 📦 Stock: \`${stock}\``;
      return `\`${i + 1}.\` **${item.name}** — 💰 \`${formatNumber(item.price)}\` coins${stockTag}\n` +
        `    ${item.description || 'No description'}${item.roleId ? ` → 🎭 <@&${item.roleId}>` : ''}`;
    }).join('\n\n');

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🛒 Server Shop\nUse \`buy <item name>\` to purchase!\n\n${itemList}\n\n-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
