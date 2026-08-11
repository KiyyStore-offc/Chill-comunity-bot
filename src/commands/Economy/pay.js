const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'pay',
  aliases: ['give', 'transfer'],
  category: 'Economy',
  description: 'Pay coins to another user',
  cooldown: 5,
  slashOptions: [
    { name: 'user', description: 'User to pay', type: 6, required: true },
    { name: 'amount', description: 'Amount to pay', type: 4, required: true, min_value: 1 }
  ],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, amount, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    return this._run(message, target, amount, client);
  },

  async _run(ctx, target, amount, client) {
    const author = ctx.author || ctx.user;
    if (!target || !amount || amount < 1) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Usage: \`pay @user <amount>\``))], flags: MessageFlags.IsComponentsV2 });
    if (target.id === author.id) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You can't pay yourself!`))], flags: MessageFlags.IsComponentsV2 });
    if (target.bot) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You can't pay bots!`))], flags: MessageFlags.IsComponentsV2 });

    const myEco = getEcoData(client, author.id);
    if ((myEco.wallet || 0) < amount) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You don't have enough coins! You have \`${formatNumber(myEco.wallet || 0)}\`.`))], flags: MessageFlags.IsComponentsV2 });

    const targetEco = getEcoData(client, target.id);
    myEco.wallet = (myEco.wallet || 0) - amount;
    targetEco.wallet = (targetEco.wallet || 0) + amount;
    saveEcoData(client, author.id, myEco);
    saveEcoData(client, target.id, targetEco);
    client.db.transactions?.add(author.id, 'pay', -amount, `Paid ${target.username}`);
    client.db.transactions?.add(target.id, 'receive', amount, `Received from ${author.username}`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ${emoji.trade} Payment Sent! ✅\nYou sent **${formatNumber(amount)} coins** to **${target.username}**!\n\n` +
        `> 👛 **Your Wallet:** \`${formatNumber(myEco.wallet)}\`\n> 👛 **Their Wallet:** \`${formatNumber(targetEco.wallet)}\`\n\n-# Chill Economy`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
