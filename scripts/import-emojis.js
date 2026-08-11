const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const emojiFile = path.join(__dirname, '..', 'src', 'emojis.js');
const configFile = path.join(__dirname, '..', 'src', 'config.json');
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const token = process.env.DISCORD_TOKEN || config.token;
const guildId = process.env.EMOJI_GUILD_ID || process.argv[2];

if (!token || !guildId) {
  console.error('Provide a server ID: node scripts/import-emojis.js YOUR_SERVER_ID');
  process.exit(1);
}

function getSourceEmojis(source) {
  const emojis = new Map();
  const pattern = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
  for (const match of source.matchAll(pattern)) {
    const [, animated, name, id] = match;
    if (!emojis.has(id)) emojis.set(id, { id, name, animated: Boolean(animated) });
  }
  return [...emojis.values()];
}

function makeName(name, usedNames) {
  const base = name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 28) || 'emoji';
  let candidate = base;
  let suffix = 1;
  while (usedNames.has(candidate)) candidate = `${base}_${suffix++}`.slice(0, 32);
  return candidate;
}

async function imageData(url, animated) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`source image is unavailable (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = animated ? 'image/gif' : 'image/png';
  return `data:${type};base64,${bytes.toString('base64')}`;
}

async function main() {
  const source = fs.readFileSync(emojiFile, 'utf8');
  const sourceEmojis = getSourceEmojis(source);
  const rest = new REST({ version: '10' }).setToken(token);

  const [guild, existing] = await Promise.all([
    rest.get(Routes.guild(guildId)),
    rest.get(Routes.guildEmojis(guildId)),
  ]);
  const usedNames = new Set(existing.map((emoji) => emoji.name));
  const staticCount = sourceEmojis.filter((emoji) => !emoji.animated).length;
  const animatedCount = sourceEmojis.length - staticCount;
  const currentStatic = existing.filter((emoji) => !emoji.animated).length;
  const currentAnimated = existing.length - currentStatic;
  const tierLimits = [50, 100, 150, 250];
  const limit = tierLimits[guild.premium_tier] || 50;

  if (currentStatic + staticCount > limit || currentAnimated + animatedCount > limit) {
    throw new Error(
      `Not enough emoji slots. Need ${staticCount} static and ${animatedCount} animated slots; ` +
      `this server currently has ${currentStatic}/${limit} static and ${currentAnimated}/${limit} animated.`
    );
  }
  console.log(`Importing ${staticCount} static and ${animatedCount} animated emojis.`);

  const backup = `${emojiFile}.before-import-${Date.now()}`;
  fs.copyFileSync(emojiFile, backup);
  console.log(`Backup created: ${backup}`);

  const replacements = new Map();
  for (const [index, sourceEmoji] of sourceEmojis.entries()) {
    const name = makeName(sourceEmoji.name, usedNames);
    const extension = sourceEmoji.animated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${sourceEmoji.id}.${extension}?quality=lossless`;
    console.log(`Uploading ${index + 1}/${sourceEmojis.length}: ${name}`);

    const image = await imageData(url, sourceEmoji.animated);
    const uploaded = await rest.post(Routes.guildEmojis(guildId), {
      body: { name, image },
      reason: 'Migrating bot emoji assets',
    });
    usedNames.add(uploaded.name);
    replacements.set(sourceEmoji.id, `<${uploaded.animated ? 'a' : ''}:${uploaded.name}:${uploaded.id}>`);
  }

  let updated = source;
  for (const [oldId, newMention] of replacements) {
    updated = updated.replace(new RegExp(`<a?:[^:>]+:${oldId}>`, 'g'), newMention);
  }
  fs.writeFileSync(emojiFile, updated, 'utf8');
  console.log(`Done. Updated ${path.relative(process.cwd(), emojiFile)} automatically.`);
}

main().catch((error) => {
  console.error(`Import failed: ${error.message}`);
  if (error.stack) console.error(error.stack);
  process.exitCode = 1;
});
