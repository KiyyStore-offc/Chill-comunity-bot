const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'inventory',
  aliases: ['inv', 'bag', 'items'],
  category: 'Economy',
  description: 'View your inventory',
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to check', type: 6, required: false }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user') || interaction.user;
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || message.author;
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const items = client.db.inventory ? client.db.inventory.get(target.id) : [];
    if (!items || items.length === 0) {
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎒 ${target.username}'s Inventory\nInventory is empty! Use \`shop\` to buy items.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
    const grouped = {};
    for (const item of items) {
      grouped[item.name] = (grouped[item.name] || 0) + 1;
    }
    const list = Object.entries(grouped).map(([name, qty]) => `> 📦 **${name}** × ${qty}`).join('\n');
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎒 ${target.username}'s Inventory\n${list}\n\n**Total Items:** ${items.length}\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
