const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const PP_CD = 1800000;

module.exports = {
  name: 'pickpocket',
  aliases: ['pocket', 'filch'],
  category: 'Economy',
  description: 'Pickpocket coins from someone\'s wallet (30% success rate)',
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'Who to pickpocket', type: 6, required: true }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first();
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const author = ctx.author || ctx.user;
    if (!target || target.bot || target.id === author.id)
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Please mention a valid person to pickpocket.'))], flags: MessageFlags.IsComponentsV2 });

    const myEco = getEcoData(client, author.id);
    const cd = getCooldown(myEco.lastPickpocket, PP_CD);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ✋ Laying Low\nYou need to be more careful! Ready in \`${formatCooldown(cd)}\`\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });

    const targetEco = getEcoData(client, target.id);
    if ((targetEco.wallet || 0) < 50) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 😅 Empty Pockets\n**${target.username}** is broke — nothing to steal!\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    myEco.lastPickpocket = new Date().toISOString();
    const SUCCESS = 0.30;

    if (Math.random() < SUCCESS) {
      const stolen = Math.floor(targetEco.wallet * (0.03 + Math.random() * 0.07));
      myEco.wallet = (myEco.wallet || 0) + stolen;
      myEco.totalEarned = (myEco.totalEarned || 0) + stolen;
      targetEco.wallet = Math.max(0, (targetEco.wallet || 0) - stolen);
      saveEcoData(client, author.id, myEco);
      saveEcoData(client, target.id, targetEco);
      client.db.transactions?.add(author.id, 'pickpocket', stolen, `Pickpocketed ${target.username}`);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🤫 Successful Pickpocket!\nYou slipped your hand into **${target.username}**'s pocket!\n\n> 💰 Stolen: \`${formatNumber(stolen)}\` coins\n> 👛 Your Wallet: \`${formatNumber(myEco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    } else {
      const fine = Math.floor((myEco.wallet || 0) * 0.05 + 50);
      myEco.wallet = Math.max(0, (myEco.wallet || 0) - fine);
      saveEcoData(client, author.id, myEco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🚨 Caught Red-Handed!\n**${target.username}** felt your hand and grabbed your wrist!\nYou paid a \`${formatNumber(fine)}\` coin penalty.\n\n> 👛 Your Wallet: \`${formatNumber(myEco.wallet)}\`\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
