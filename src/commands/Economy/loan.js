const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const MAX_LOAN = 50000;
const INTEREST = 0.1;

module.exports = {
  name: 'loan',
  aliases: ['borrow'],
  category: 'Economy',
  description: 'Take a loan from the Chill Bank',
  cooldown: 5,
  slashOptions: [{ name: 'amount', description: 'Amount to borrow (max 50000)', type: 4, required: true, min_value: 100, max_value: 50000 }],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getInteger('amount'), client);
  },
  async execute(message, args, client) { return this._run(message, parseInt(args[0]), client); },

  async _run(ctx, amount, client) {
    const userId = (ctx.author || ctx.user).id;
    if (!amount || amount < 100 || amount > MAX_LOAN) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ Loan amount must be between \`100\` and \`${formatNumber(MAX_LOAN)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });

    const existingLoan = client.db.loans ? client.db.loans.get(userId) : null;
    if (existingLoan) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You already have an outstanding loan of \`${formatNumber(existingLoan.amount)}\` coins. Use \`repay\` first.`))], flags: MessageFlags.IsComponentsV2 });

    const repayAmount = Math.floor(amount * (1 + INTEREST));
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const confirmBtn = new ButtonBuilder().setCustomId(`loan_confirm_${userId}_${amount}`).setLabel('Accept Loan').setStyle(ButtonStyle.Success);
    const cancelBtn = new ButtonBuilder().setCustomId('loan_cancel').setLabel('Decline').setStyle(ButtonStyle.Danger);
    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🏦 Chill Bank — Loan Offer\n` +
        `**Loan Amount:** \`${formatNumber(amount)}\` coins\n` +
        `**Interest:** \`${(INTEREST * 100).toFixed(0)}%\`\n` +
        `**Total to Repay:** \`${formatNumber(repayAmount)}\` coins\n` +
        `**Due:** 7 days from now\n\n` +
        `> ⚠️ Failure to repay may result in penalties!\n-# Chill Economy`
      ))
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(row);

    const msg = await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    const sent = msg || ctx.channel?.lastMessage;
    if (!sent) return;

    const collector = sent.createMessageComponentCollector({ time: 30000 });
    collector.on('collect', async (i) => {
      const userId2 = (ctx.author || ctx.user).id;
      if (i.user.id !== userId2) return i.reply({ content: '❌ Not for you.', flags: 64 });
      if (i.customId === 'loan_cancel') {
        return i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Loan Declined\nYou declined the loan offer.`))], flags: MessageFlags.IsComponentsV2 });
      }
      const eco = getEcoData(client, userId);
      eco.wallet = (eco.wallet || 0) + amount;
      saveEcoData(client, userId, eco);
      if (client.db.loans) client.db.loans.set(userId, { amount: repayAmount, due: dueDate, interest: INTEREST });
      await i.update({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Loan Approved!\n**+${formatNumber(amount)} coins** added to your wallet.\n**Repay:** \`${formatNumber(repayAmount)}\` within 7 days.\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
      collector.stop();
    });
  }
};
