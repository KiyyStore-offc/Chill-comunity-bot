const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');
const emoji = require('../../emojis.js');

const ROB_COOLDOWN = 7200000;
const SUCCESS_CHANCE = 0.45;

module.exports = {
  name: 'rob',
  aliases: ['steal', 'mug'],
  category: 'Economy',
  description: 'Rob someone and steal their coins',
  cooldown: 5,
  slashOptions: [{ name: 'user', description: 'User to rob', type: 6, required: true }],

  async slashExecute(interaction, client) {
    const target = interaction.options.getUser('user');
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, target, client);
  },
  async execute(message, args, client) {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    return this._run(message, target, client);
  },

  async _run(ctx, target, client) {
    const author = ctx.author || ctx.user;
    if (!target) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please mention someone to rob!`))], flags: MessageFlags.IsComponentsV2 });
    if (target.id === author.id || target.bot) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} You can't rob yourself or bots!`))], flags: MessageFlags.IsComponentsV2 });

    const myEco = getEcoData(client, author.id);
    const cd = getCooldown(myEco.lastRob, ROB_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Cooldown\nYou need to lay low before robbing again!\n**Ready in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const targetEco = getEcoData(client, target.id);
    if ((targetEco.wallet || 0) < 100) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 😂 Too Poor\n**${target.username}** doesn't even have 100 coins — not worth it!\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    myEco.lastRob = new Date().toISOString();

    if (Math.random() < SUCCESS_CHANCE) {
      const stolen = Math.floor(targetEco.wallet * (0.1 + Math.random() * 0.3));
      myEco.wallet = (myEco.wallet || 0) + stolen;
      myEco.totalEarned = (myEco.totalEarned || 0) + stolen;
      targetEco.wallet = Math.max(0, (targetEco.wallet || 0) - stolen);
      saveEcoData(client, author.id, myEco);
      saveEcoData(client, target.id, targetEco);
      client.db.transactions?.add(author.id, 'rob', stolen, `Robbed ${target.username}`);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ${emoji.rob} Robbery Successful! 🎭\nYou sneaked up on **${target.username}** and stole their coins!\n\n` +
          `> 💰 **Stolen:** \`${formatNumber(stolen)} coins\`\n` +
          `> 👛 **Your Wallet:** \`${formatNumber(myEco.wallet)}\`\n\n` +
          `-# Chill Economy • Developed by AkiForver`
        ));
      return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      const fine = Math.floor((myEco.wallet || 0) * 0.2);
      myEco.wallet = Math.max(0, (myEco.wallet || 0) - fine);
      saveEcoData(client, author.id, myEco);
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🚔 Caught Red-Handed!\n**${target.username}** caught you trying to rob them!\nYou paid a fine of \`${formatNumber(fine)} coins\`.\n\n` +
          `> 👛 **Your Wallet:** \`${formatNumber(myEco.wallet)}\`\n\n-# Chill Economy`
        ));
      return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
