const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const PETS = [
  { id: 'cat', name: '🐱 Cat', desc: 'Brings small daily coins', cost: 3000, dailyBonus: 100 },
  { id: 'dog', name: '🐶 Dog', desc: 'Protects from 20% rob loss', cost: 4000, protection: 0.2 },
  { id: 'dragon', name: '🐲 Dragon', desc: '+20% all combat rewards', cost: 25000, combatBonus: 0.2 },
  { id: 'fox', name: '🦊 Fox', desc: '+15% crime success rate', cost: 12000, crimeBonus: 0.15 },
  { id: 'penguin', name: '🐧 Penguin', desc: '+25% fishing income', cost: 8000, fishBonus: 0.25 },
];

module.exports = {
  name: 'pet',
  aliases: ['pets', 'companion'],
  category: 'Economy',
  description: 'View and manage your pet companion',
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'view, buy, or release', type: 3, required: false, choices: [{ name: 'view', value: 'view' }, { name: 'buy', value: 'buy' }, { name: 'release', value: 'release' }] },
    { name: 'pet', description: 'Pet to buy/release', type: 3, required: false, choices: PETS.map(p => ({ name: p.name, value: p.id })) }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('action') || 'view', interaction.options.getString('pet'), client);
  },
  async execute(message, args, client) { return this._run(message, args[0] || 'view', args[1], client); },

  async _run(ctx, action, petId, client) {
    const userId = (ctx.author || ctx.user).id;
    const eco = getEcoData(client, userId);
    const ownedPet = eco.pet ? PETS.find(p => p.id === eco.pet) : null;

    if (action === 'view' || !action) {
      const petList = PETS.map(p => `${eco.pet === p.id ? '✅' : '⬜'} **${p.name}** — \`${formatNumber(p.cost)}\`\n  *${p.desc}*`).join('\n');
      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🐾 Pet System\n**Your Pet:** ${ownedPet ? ownedPet.name : '`None`'}\n\n${petList}\n\nUse \`pet buy <pet>\` to adopt!\n-# Chill Economy`
        ));
      return ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'buy') {
      if (!petId) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Specify a pet to buy.'))], flags: MessageFlags.IsComponentsV2 });
      if (ownedPet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You already have **${ownedPet.name}**! Release it first.`))], flags: MessageFlags.IsComponentsV2 });
      const pet = PETS.find(p => p.id === petId);
      if (!pet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ Invalid pet.'))], flags: MessageFlags.IsComponentsV2 });
      if ((eco.wallet || 0) < pet.cost) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ You need \`${formatNumber(pet.cost)}\` coins.`))], flags: MessageFlags.IsComponentsV2 });
      eco.wallet = (eco.wallet || 0) - pet.cost;
      eco.pet = petId;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🐾 Pet Adopted!\nYou adopted **${pet.name}**!\n*${pet.desc}*\n> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'release') {
      if (!ownedPet) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ You have no pet to release.'))], flags: MessageFlags.IsComponentsV2 });
      eco.pet = null;
      saveEcoData(client, userId, eco);
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🐾 Pet Released\n**${ownedPet.name}** has been released. Goodbye!\n-# Chill Economy`))], flags: MessageFlags.IsComponentsV2 });
    }
  }
};
