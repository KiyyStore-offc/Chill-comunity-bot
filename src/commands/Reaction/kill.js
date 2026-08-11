const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder } = require('discord.js');
const { fetchGif } = require('../../utils/gifUtils.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'kill',
  category: 'Reaction',
  description: 'Kill someone with an anime GIF',
  cooldown: 3,
  slashOptions: [{ name: 'user', description: 'User to kill', type: 6, required: false }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, guild: interaction.guild, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    return this._run(message, target, client);
  },
  async _run(ctx, target, client) {
    const author = ctx.author || ctx.user;
    const { url } = await fetchGif('kill');
    const isSelf = !target || target.id === author.id;
    const text = isSelf
      ? `**${author.username}** commits a dramatic anime death! 💀`
      : `**${author.username}** kills **${target.username}**! 💀`;
    const media = new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url));
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${emoji.skull} Kill!\n${text}\n-# Powered by Chill • Developed by AkiForver`))
      .addSeparatorComponents(new SeparatorBuilder())
      .addMediaGalleryComponents(media);
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
