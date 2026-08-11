const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { fetchGif } = require('../../utils/gifUtils.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'facepalm',
  aliases: ['fp'],
  category: 'Reaction',
  description: 'Facepalm at someone or something',
  cooldown: 3,
  slashOptions: [{ name: 'user', description: 'User to facepalm at', type: 6, required: false }],

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
    const { url } = await fetchGif('facepalm');
    const text = target && target.id !== author.id ? `**${author.username}** facepalms at **${target.username}**... 🤦` : `**${author.username}** facepalms... 🤦`;
    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.facepalm} Facepalm!\n${text}\n-# Powered by Chill • Developed by AkiForver`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(media);
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
