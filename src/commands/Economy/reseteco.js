const { ContainerBuilder, TextDisplayBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'reseteco',
  aliases: ['ecoreset', 'cleareconomy'],
  category: 'Economy',
  description: 'Reset a user\'s economy data (Owner only)',
  owner: true,
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to reset', type: 6, required: true }],

  async slashExecute(interaction, client) {
    if (!client.owners?.includes(interaction.user.id)) return interaction.reply({ content: '❌ Owner only.', flags: 64 });
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    if (!client.owners?.includes(message.author.id)) return;
    const target = message.mentions.users.first();
    return this._run(message, target, client);
  },
  async _run(ctx, target, client) {
    if (!target) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a user.'))], flags: MessageFlags.IsComponentsV2 });
    if (client.db.economy) client.db.economy.delete(target.id);
    if (client.db.inventory) { try { client.db.db.prepare('DELETE FROM inventory WHERE userId = ?').run(target.id); } catch {} }
    if (client.db.achievements) client.db.achievements.set(target.id, []);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Economy Reset\n**${target.username}'s** economy data has been reset.\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
