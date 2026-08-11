const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const QUESTIONS = [
  { q: 'What is the largest planet in our solar system?', a: 'jupiter', reward: 300 },
  { q: 'How many sides does a hexagon have?', a: '6', reward: 200 },
  { q: 'What is the chemical symbol for gold?', a: 'au', reward: 350 },
  { q: 'What year did World War II end?', a: '1945', reward: 400 },
  { q: 'What is the fastest land animal?', a: 'cheetah', reward: 250 },
  { q: 'How many continents are there on Earth?', a: '7', reward: 200 },
  { q: 'What is the square root of 144?', a: '12', reward: 300 },
  { q: 'What element does "O" represent on the periodic table?', a: 'oxygen', reward: 250 },
  { q: 'What is the capital city of Japan?', a: 'tokyo', reward: 200 },
  { q: 'Who painted the Mona Lisa?', a: 'da vinci', reward: 300 },
  { q: 'What is 15% of 200?', a: '30', reward: 250 },
  { q: 'How many bones are in the adult human body?', a: '206', reward: 400 },
  { q: 'What programming language is Discord.js written in?', a: 'javascript', reward: 350 },
  { q: 'What is the smallest prime number?', a: '2', reward: 200 },
  { q: 'What ocean is the largest?', a: 'pacific', reward: 250 },
];

module.exports = {
  name: 'trivia',
  aliases: ['quiz'],
  category: 'Economy',
  description: 'Answer a trivia question to earn coins',
  cooldown: 30,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o), channel: interaction.channel }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const qObj = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🧠 Trivia Time!\n\n**${qObj.q}**\n\n> 💰 Reward: \`${formatNumber(qObj.reward)}\` coins if correct\n> You have **20 seconds** to answer!\n-# Chill Economy`
      ));
    await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const channel = ctx.channel;
    const filter = m => m.author.id === userId;
    try {
      const collected = await channel.awaitMessages({ filter, max: 1, time: 20000, errors: ['time'] });
      const answer = collected.first().content.toLowerCase().trim();

      if (answer === qObj.a) {
        const eco = getEcoData(client, userId);
        eco.wallet = (eco.wallet || 0) + qObj.reward;
        eco.totalEarned = (eco.totalEarned || 0) + qObj.reward;
        saveEcoData(client, userId, eco);
        client.db.transactions?.add(userId, 'trivia', qObj.reward, 'Won trivia');
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ✅ Correct!\nThe answer was **${qObj.a}**.\n\n> 💰 You earned \`${formatNumber(qObj.reward)}\` coins!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
        ));
        return channel.send({ components: [done], flags: MessageFlags.IsComponentsV2 });
      } else {
        const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ❌ Wrong!\nThe correct answer was **${qObj.a}**.\nBetter luck next time!\n-# Chill Economy`
        ));
        return channel.send({ components: [done], flags: MessageFlags.IsComponentsV2 });
      }
    } catch {
      const done = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⏰ Time's Up!\nThe correct answer was **${qObj.a}**.\n-# Chill Economy`
      ));
      return channel.send({ components: [done], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
