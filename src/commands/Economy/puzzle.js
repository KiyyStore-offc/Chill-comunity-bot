const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

function generatePuzzle() {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer, reward;
  if (op === '+') { a = Math.floor(Math.random() * 900) + 100; b = Math.floor(Math.random() * 900) + 100; answer = a + b; reward = 300; }
  else if (op === '-') { a = Math.floor(Math.random() * 900) + 200; b = Math.floor(Math.random() * a); answer = a - b; reward = 350; }
  else { a = Math.floor(Math.random() * 50) + 2; b = Math.floor(Math.random() * 50) + 2; answer = a * b; reward = 500; }
  return { question: `${a} ${op} ${b} = ?`, answer: answer.toString(), reward };
}

module.exports = {
  name: 'puzzle',
  aliases: ['mathquiz', 'calculate'],
  category: 'Economy',
  description: 'Solve a math puzzle to earn coins',
  cooldown: 20,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o), channel: interaction.channel }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const puzzle = generatePuzzle();

    const container = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### 🧮 Math Puzzle!\n\n\`\`\`\n${puzzle.question}\n\`\`\`\n> 💰 Reward: \`${formatNumber(puzzle.reward)}\` coins\n> You have **25 seconds** to solve it!\n-# Chill Economy`
    ));
    await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });

    const channel = ctx.channel;
    try {
      const collected = await channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 25000, errors: ['time'] });
      const ans = collected.first().content.trim();
      if (ans === puzzle.answer) {
        const eco = getEcoData(client, userId);
        eco.wallet = (eco.wallet || 0) + puzzle.reward;
        eco.totalEarned = (eco.totalEarned || 0) + puzzle.reward;
        saveEcoData(client, userId, eco);
        client.db.transactions?.add(userId, 'puzzle', puzzle.reward, 'Solved math puzzle');
        return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ✅ Correct! 🧮\nThe answer was **${puzzle.answer}**.\n\n> 💰 You earned \`${formatNumber(puzzle.reward)}\` coins!\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      } else {
        return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### ❌ Wrong!\nThe correct answer was **${puzzle.answer}**.\n-# Chill Economy`
        ))], flags: MessageFlags.IsComponentsV2 });
      }
    } catch {
      return channel.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⏰ Time's Up!\nThe correct answer was **${puzzle.answer}**.\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
