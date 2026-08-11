const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'verify',
  category: 'Verification',
  description: 'Verify yourself in the server',
  cooldown: 10,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, guild: interaction.guild, member: interaction.member, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const guild = ctx.guild;
    const author = ctx.author || ctx.user;
    const member = ctx.member || guild.members.cache.get(author.id);
    const reply = async (o) => ctx.reply ? ctx.reply(o) : ctx.channel.send(o);

    const settings = client.db.verification ? client.db.verification.get(guild.id) : null;
    if (!settings || !settings.enabled) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Verification is not enabled in this server.'))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    if (!settings.roleId) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Verification role not configured.'))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    if (member.roles.cache.has(settings.roleId)) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ You are already verified!'))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

    try {
      await member.roles.add(settings.roleId, 'Verification');
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Verified!\nWelcome to **${guild.name}**! You have been verified.\n-# Chill Verification • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    } catch (err) {
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Failed to give verification role: ${err.message}`))], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
  }
};
