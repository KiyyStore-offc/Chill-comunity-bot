const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const DAILY_QUESTS = [
  { id: 'fish_5', name: '🎣 Fisher', desc: 'Go fishing 5 times', reward: 500, type: 'fish', target: 5 },
  { id: 'work_3', name: '👷 Worker', desc: 'Work 3 times', reward: 750, type: 'work', target: 3 },
  { id: 'gamble_2', name: '🎰 Gambler', desc: 'Gamble 2 times', reward: 300, type: 'gamble', target: 2 },
  { id: 'earn_1000', name: '💰 Earner', desc: 'Earn 1000 coins in one day', reward: 1000, type: 'earn', target: 1000 },
];

module.exports = {
  name: 'quest',
  aliases: ['quests', 'dailyquest'],
  category: 'Economy',
  description: 'View and track your daily quests',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const today = new Date().toDateString();
    const questData = eco.questData || {};
    if (questData.date !== today) {
      questData.date = today;
      questData.quests = DAILY_QUESTS.map(q => ({ ...q, progress: 0, completed: false }));
      eco.questData = questData;
      saveEcoData(client, userId, eco);
    }

    const quests = questData.quests || [];
    const list = quests.map(q =>
      `${q.completed ? '✅' : '⬜'} **${q.name}**\n  ${q.desc}\n  Progress: \`${q.progress}/${q.target}\` | Reward: \`${formatNumber(q.reward)} coins\``
    ).join('\n\n');

    const completed = quests.filter(q => q.completed).length;
    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 📌 Daily Quests\n**Completed:** \`${completed}/${quests.length}\`\n\n${list}\n\n-# Chill Economy • Developed by AkiForver`
      ));
    return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  }
};
