const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, formatNumber, getXpRequired } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'bank',
  aliases: ['bankinfo', 'account'],
  category: 'Economy',
  description: 'View your bank account details',
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
    const loan = client.db.loans ? client.db.loans.get(target.id) : null;
    const xpReq = getXpRequired(eco.level || 1);
    const xpCur = (eco.xp || 0) % xpReq;
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🏦 Chill Bank — ${target.username}\n` +
        `\`\`\`ansi\n` +
        `\u001b[1;33m💰 Wallet     \u001b[0m :: \u001b[1;37m${formatNumber(eco.wallet || 0)} coins\u001b[0m\n` +
        `\u001b[1;34m🏦 Bank       \u001b[0m :: \u001b[1;37m${formatNumber(eco.bank || 0)} coins\u001b[0m\n` +
        `\u001b[1;32m💎 Net Worth  \u001b[0m :: \u001b[1;37m${formatNumber((eco.wallet || 0) + (eco.bank || 0))} coins\u001b[0m\n` +
        `\u001b[1;35m📶 Level      \u001b[0m :: \u001b[1;37m${eco.level || 1} (Prestige ${eco.prestige || 0})\u001b[0m\n` +
        `\u001b[1;36m🔮 XP         \u001b[0m :: \u001b[1;37m${formatNumber(xpCur)} / ${formatNumber(xpReq)}\u001b[0m\n` +
        `\u001b[1;31m💳 Loan       \u001b[0m :: \u001b[1;37m${loan ? formatNumber(loan.amount) + ' coins' : 'None'}\u001b[0m\n` +
        `\u001b[1;33m💸 Total Earn \u001b[0m :: \u001b[1;37m${formatNumber(eco.totalEarned || 0)} coins\u001b[0m\n` +
        `\`\`\`\n-# Chill Bank • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
