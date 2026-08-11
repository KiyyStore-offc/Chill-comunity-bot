const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'networth',
  aliases: ['nw', 'worth'],
  category: 'Economy',
  description: 'View your total net worth',
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
    const eco = getEcoData(client, target.id);
    const nw = (eco.wallet || 0) + (eco.bank || 0);
    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 💎 ${target.username}'s Net Worth\n\`\`\`ansi\n\u001b[1;33m💰 Wallet     \u001b[0m :: \u001b[1;37m${formatNumber(eco.wallet || 0)} coins\u001b[0m\n\u001b[1;34m🏦 Bank       \u001b[0m :: \u001b[1;37m${formatNumber(eco.bank || 0)} coins\u001b[0m\n\u001b[1;32m💎 Net Worth  \u001b[0m :: \u001b[1;37m${formatNumber(nw)} coins\u001b[0m\n\u001b[1;35m💫 Total Earn \u001b[0m :: \u001b[1;37m${formatNumber(eco.totalEarned || 0)} coins\u001b[0m\n\`\`\`\n-# Chill Economy • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
  }
};
