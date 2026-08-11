const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { fetchGif } = require('../../utils/gifUtils.js');

module.exports = {
  name: 'thumbsup',
  aliases: ['approve'],
  category: 'Reaction',
  description: 'Give someone a thumbs up',
  cooldown: 3,
  slashOptions: [{ name: 'user', description: 'User to approve', type: 6, required: false }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || null;
    return this._run(message, target, client);
  },
  async _run(ctx, target, client) {
    const author = ctx.author || ctx.user;
    const { url } = await fetchGif('thumbsup');
    const text = target && target.id !== author.id ? `**${author.username}** gives **${target.username}** a thumbs up! 👍` : `**${author.username}** approves! 👍`;
    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👍 Thumbs Up!\n${text}\n-# Powered by Chill • Developed by AkiForver`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(media);
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
