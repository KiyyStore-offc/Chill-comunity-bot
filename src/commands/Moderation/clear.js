const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'clear',
  aliases: ['purge', 'clean', 'prune'],
  category: 'Moderation',
  description: 'Delete a number of messages from the channel',
  userPerms: ['ManageMessages'],
  botPerms: ['ManageMessages'],
  cooldown: 5,
  slashOptions: [
    { name: 'amount', description: 'Number of messages to delete (1-100)', type: 4, required: true, min_value: 1, max_value: 100 },
    { name: 'user', description: 'Only delete messages from this user', type: 6, required: false }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, guild: interaction.guild, channel: interaction.channel, editReply: (o) => interaction.editReply(o) }, amount, target, client, true);
  },
  async execute(message, args, client) {
    const amount = parseInt(args[0]);
    const target = message.mentions.users.first();
    return this._run(message, amount, target, client, false);
  },

  async _run(ctx, amount, target, client, isSlash) {
    const channel = isSlash ? ctx.channel : ctx.channel;
    const author = ctx.author || ctx.user;
    const reply = async (o) => isSlash ? ctx.editReply(o) : ctx.channel.send(o);

    if (!amount || amount < 1 || amount > 100) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Amount must be between 1 and 100.`))], flags: MessageFlags.IsComponentsV2 });

    try {
      let messages = await channel.messages.fetch({ limit: 100 });
      messages = messages.filter(m => !m.pinned && Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      if (target) messages = messages.filter(m => m.author.id === target.id);
      const toDelete = messages.first(amount);
      const deleted = await channel.bulkDelete(toDelete, true).catch(() => null);
      const count = deleted?.size || 0;

      if (!isSlash) {
        const notice = await channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🗑️ Cleared ${count} message(s)${target ? ` from **${target.username}**` : ''}.\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
        setTimeout(() => notice.delete().catch(() => {}), 5000);
      } else {
        reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🗑️ Cleared ${count} message(s).\n-# Chill Moderation`))], flags: MessageFlags.IsComponentsV2 });
      }
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Failed: ${err.message}`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
