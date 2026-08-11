const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

module.exports = {
  name: 'guess',
  aliases: ['numbguess', 'numguess'],
  category: 'Economy',
  description: 'Guess a number 1-100 to earn coins (5 tries)',
  cooldown: 15,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o), channel: interaction.channel }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const secret = Math.floor(Math.random() * 100) + 1;
    const REWARD = 450;
    let tries = 5;

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 🎯 Number Guessing Game!\n\nI'm thinking of a number between **1** and **100**.\nYou have **5 tries** to guess it!\n\n> 💰 Reward: \`${formatNumber(REWARD)}\` coins\n-# Chill Economy`
    ));
    await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const channel = ctx.channel;
    const filter = m => m.author.id === userId && !isNaN(parseInt(m.content));

    const askNext = async () => {
      if (tries <= 0) {
        return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ❌ Game Over!\nThe number was **${secret}**. Better luck next time!\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
      try {
        const collected = await channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const guess = parseInt(collected.first().content);
        tries--;
        if (guess === secret) {
          const eco = getEcoData(client, userId);
          eco.wallet = (eco.wallet || 0) + REWARD;
          eco.totalEarned = (eco.totalEarned || 0) + REWARD;
          saveEcoData(client, userId, eco);
          client.db.transactions?.add(userId, 'guess', REWARD, 'Won number guessing game');
          return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🎯 Correct! You got it!\nThe number was **${secret}**.\n\n> 💰 Earned \`${formatNumber(REWARD)}\` coins!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
          ))], flags: MessageFlags.IsComponentsV2 });
        } else {
          const hint = guess < secret ? 'higher ☝️' : 'lower 👇';
          return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🎯 Guess: \`${guess}\`\nGo **${hint}**! (${tries} tries left)\n-# Chill Economy`
          ))], flags: MessageFlags.IsComponentsV2 }).then(() => askNext());
        }
      } catch {
        return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ⏰ Time's Up!\nThe number was **${secret}**.\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    };
    return askNext();
  }
};
