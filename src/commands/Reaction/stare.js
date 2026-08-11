const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { fetchGif } = require('../../utils/gifUtils.js');

module.exports = {
  name: 'stare',
  category: 'Reaction',
  description: 'Stare intensely at someone',
  cooldown: 3,
  slashOptions: [{ name: 'user', description: 'User to stare at', type: 6, required: false }],

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
    const { url } = await fetchGif('stare');
    const text = target && target.id !== author.id ? `**${author.username}** stares intensely at **${target.username}**... 👁️` : `**${author.username}** stares into the void... 👁️`;
    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👁️ Stare!\n${text}\n-# Powered by Chill • Developed by AkiForver`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(media);
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
