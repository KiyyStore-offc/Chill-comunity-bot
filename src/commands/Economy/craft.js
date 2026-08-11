const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getEcoData, saveEcoData, formatNumber } = require('../../utils/economyUtils.js');

const RECIPES = [
  { name: 'Mystic Blade',     ingredients: ['Dragon Scale', 'Crystal Ball'], reward: 2000, xpBonus: 100 },
  { name: 'Elven Crown',      ingredients: ['Phoenix Feather', 'Gem Shard'], reward: 1500, xpBonus: 80 },
  { name: 'Void Armor',       ingredients: ['Void Stone', 'Ancient Scroll'], reward: 5000, xpBonus: 200 },
  { name: 'Lucky Amulet',     ingredients: ['Lucky Dice', 'Strange Orb'],    reward: 800,  xpBonus: 50 },
  { name: 'Ancient Key',      ingredients: ['Silver Key', 'Old Map'],        reward: 600,  xpBonus: 40 },
  { name: 'Time Crystal',     ingredients: ['Time Jewel', 'Star Fragment'],  reward: 8000, xpBonus: 300 },
];

module.exports = {
  name: 'craft',
  aliases: ['forge', 'make'],
  category: 'Economy',
  description: 'Craft items from your inventory for coin rewards',
  cooldown: 10,
  slashOptions: [
    { name: 'item', description: 'Item to craft (or "list" to see recipes)', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    return this._run({ author: interaction.user, reply: async (o) => interaction.reply(o) }, interaction.options.getString('item') || 'list', client);
  },
  async execute(message, args, client) {
    return this._run(message, args.join(' ') || 'list', client);
  },

  async _run(ctx, itemName, client) {
    const userId = (ctx.author || ctx.user).id;

    if (itemName === 'list') {
      const recipeList = RECIPES.map((r, i) =>
        `\`${i+1}.\` **${r.name}** — 💰 \`${formatNumber(r.reward)}\`\n    Needs: ${r.ingredients.map(x => `\`${x}\``).join(' + ')}`
      ).join('\n\n');
      return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### ⚒️ Crafting Recipes\nUse \`craft <item name>\` to craft!\n\n${recipeList}\n\n-# Chill Economy`
      ))], flags: MessageFlags.IsComponentsV2 });
    }

    const recipe = RECIPES.find(r => r.name.toLowerCase() === itemName.toLowerCase());
    if (!recipe) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `❌ Unknown recipe \`${itemName}\`. Use \`craft list\` to see all recipes.\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });

    const inventory = client.db.inventory?.get(userId) || [];
    const missing = [];
    for (const ingredient of recipe.ingredients) {
      if (!inventory.find(item => item.name?.toLowerCase() === ingredient.toLowerCase())) {
        missing.push(ingredient);
      }
    }

    if (missing.length > 0) return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ❌ Missing Ingredients!\nYou're missing: ${missing.map(m => `**${m}**`).join(', ')}\n\nGet them from \`loot\`, \`explore\`, and other commands!\n-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });

    // Remove ingredients from inventory
    let inv = [...inventory];
    for (const ingredient of recipe.ingredients) {
      const idx = inv.findIndex(item => item.name?.toLowerCase() === ingredient.toLowerCase());
      if (idx !== -1) inv.splice(idx, 1);
    }
    inv.push({ name: recipe.name, description: 'Crafted item', type: 'crafted' });
    client.db.inventory?.set(userId, inv);

    const eco = getEcoData(client, userId);
    eco.wallet = (eco.wallet || 0) + recipe.reward;
    eco.totalEarned = (eco.totalEarned || 0) + recipe.reward;
    eco.xp = (eco.xp || 0) + recipe.xpBonus;
    saveEcoData(client, userId, eco);
    client.db.transactions?.add(userId, 'craft', recipe.reward, `Crafted ${recipe.name}`);

    return ctx.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `### ⚒️ Item Crafted!\n\n✨ **${recipe.name}** has been added to your inventory!\n\n` +
      `> 💰 Sold for: \`${formatNumber(recipe.reward)}\` coins\n` +
      `> ⭐ XP gained: \`+${recipe.xpBonus}\`\n` +
      `> 👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
      `-# Chill Economy`
    ))], flags: MessageFlags.IsComponentsV2 });
  }
};
