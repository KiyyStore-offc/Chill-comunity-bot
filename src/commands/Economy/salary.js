const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, getCooldown, formatCooldown, formatNumber } = require('../../utils/economyUtils.js');

const SALARY_COOLDOWN = 43200000;
const JOBS = [
  { role: 'Newcomer', minLevel: 1, salary: 250 },
  { role: 'Apprentice', minLevel: 5, salary: 500 },
  { role: 'Worker', minLevel: 10, salary: 1000 },
  { role: 'Specialist', minLevel: 20, salary: 2000 },
  { role: 'Expert', minLevel: 30, salary: 3500 },
  { role: 'Master', minLevel: 40, salary: 5000 },
  { role: 'Grandmaster', minLevel: 50, salary: 8000 },
];

module.exports = {
  name: 'salary',
  aliases: ['collect', 'payday'],
  category: 'Economy',
  description: 'Collect your passive salary based on your level',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, client);
  },
  async execute(message, args, client) { return this._run(message, client); },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const cd = getCooldown(eco.lastSalary, SALARY_COOLDOWN);
    if (cd > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⏰ Salary Cooldown\n**Next paycheck in:** \`${formatCooldown(cd)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });

    const level = eco.level || 1;
    const job = [...JOBS].reverse().find(j => level >= j.minLevel) || JOBS[0];
    const salary = Math.floor(job.salary * (1 + (eco.prestige || 0) * 0.1));

    eco.wallet = (eco.wallet || 0) + salary;
    eco.totalEarned = (eco.totalEarned || 0) + salary;
    eco.lastSalary = new Date().toISOString();
    saveEcoData(client, userId, eco);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 💵 Salary Collected!\n**Role:** \`${job.role}\` (Level ${level})\n**Salary:** \`+${formatNumber(salary)} coins\`\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
  }
};
