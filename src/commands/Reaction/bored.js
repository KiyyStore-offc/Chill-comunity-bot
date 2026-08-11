const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { fetchGif } = require('../../utils/gifUtils.js');

module.exports = {
  name: 'bored',
  category: 'Reaction',
  description: 'Show that you are bored',
  cooldown: 3,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },
  async _run(ctx, client) {
    const author = ctx.author || ctx.user;
    const { url } = await fetchGif('bored');
    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 😴 Bored...\n**${author.username}** is SO bored right now 😴\n-# Powered by Chill • Developed by AkiForver`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(media);
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
