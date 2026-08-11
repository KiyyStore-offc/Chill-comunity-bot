const axios = require('axios');

const reactionMap = {
  hug: 'hug',
  kiss: 'kiss',
  slap: 'slap',
  pat: 'pat',
  cuddle: 'cuddle',
  poke: 'poke',
  kick: 'kick',
  lick: 'lick',
  bite: 'bite',
  punch: 'punch',
  cry: 'cry',
  blush: 'blush',
  smile: 'smile',
  wave: 'wave',
  highfive: 'highfive',
  dance: 'dance',
  wink: 'wink',
  nod: 'nod',
  shrug: 'shrug',
  facepalm: 'facepalm',
  laugh: 'laugh',
  angry: 'angry',
  feed: 'feed',
  nom: 'nom',
  stare: 'stare',
  yeet: 'yeet',
  run: 'run',
  sleep: 'sleep',
  pout: 'pout',
  thumbsup: 'thumbsup',
  bored: 'bored',
  happy: 'happy',
  kill: 'kill',
};

const fallbackGifs = {
  hug:       'https://media1.tenor.com/m/gIh7VKCHQ4EAAAAC/hug-anime.gif',
  kiss:      'https://media1.tenor.com/m/YQm1ckDmfwYAAAAC/anime-kiss.gif',
  slap:      'https://media1.tenor.com/m/aAFaJlvCDecAAAAC/anime-slap.gif',
  pat:       'https://media1.tenor.com/m/PKRFYDjCqy4AAAAC/anime-pat.gif',
  cuddle:    'https://media1.tenor.com/m/pESkHCh3UZoAAAAC/cuddle-anime.gif',
  poke:      'https://media1.tenor.com/m/w7QyBpTaZNUAAAAC/anime-poke.gif',
  kick:      'https://media1.tenor.com/m/6VwPsO_CiJAAAAAC/anime-kick.gif',
  lick:      'https://media1.tenor.com/m/bFn50f8dXRQAAAAC/anime-lick.gif',
  bite:      'https://media1.tenor.com/m/wGajM0LGCqIAAAAC/anime-bite.gif',
  punch:     'https://media1.tenor.com/m/RWaJJRKm5TUAAAAC/anime-punch.gif',
  cry:       'https://media1.tenor.com/m/QhfFLRpQ3CQAAAAC/anime-cry.gif',
  blush:     'https://media1.tenor.com/m/FW6yXwdFE2kAAAAC/anime-blush.gif',
  smile:     'https://media1.tenor.com/m/dSTZ7qvPJtcAAAAC/anime-smile.gif',
  wave:      'https://media1.tenor.com/m/lDTaEf9k2U0AAAAC/anime-wave.gif',
  highfive:  'https://media1.tenor.com/m/I4TTfJUJuEAAAAAC/high-five-anime.gif',
  dance:     'https://media1.tenor.com/m/V0HYnVMbrOoAAAAC/anime-dance.gif',
  wink:      'https://media1.tenor.com/m/3oWuMJVnf9IAAAAC/anime-wink.gif',
  nod:       'https://media1.tenor.com/m/DijMBSmP7KEAAAAC/anime-nod.gif',
  shrug:     'https://media1.tenor.com/m/b8X4o_oBsm0AAAAC/shrug-anime.gif',
  facepalm:  'https://media1.tenor.com/m/KeIBuOyBRiQAAAAC/anime-facepalm.gif',
  laugh:     'https://media1.tenor.com/m/x2v3TtABy7UAAAAC/anime-laugh.gif',
  angry:     'https://media1.tenor.com/m/ub_6vBqp4qYAAAAC/anime-angry.gif',
  feed:      'https://media1.tenor.com/m/Z0XM5-SFN2oAAAAC/anime-feed.gif',
  nom:       'https://media1.tenor.com/m/V_ioEYGFyFEAAAAC/anime-nom.gif',
  stare:     'https://media1.tenor.com/m/VS8GGrGQwcMAAAAC/anime-stare.gif',
  yeet:      'https://media1.tenor.com/m/7yfJEapJpfQAAAAC/anime-yeet.gif',
  thumbsup:  'https://media1.tenor.com/m/Q3ug8D3m8OAAAAAC/anime-thumbs-up.gif',
  bored:     'https://media1.tenor.com/m/SYBtNB4WLFIAAAAC/anime-bored.gif',
  kill:      'https://media1.tenor.com/m/qGTFDhkfGaEAAAAC/anime-kill.gif',
};

async function fetchGif(reaction) {
  const apiReaction = reactionMap[reaction] || reaction;

  try {
    const res = await axios.get(`https://nekos.best/api/v2/${apiReaction}`, { timeout: 5000 });
    if (res.data?.results?.[0]?.url) {
      return { url: res.data.results[0].url, animeName: res.data.results[0].anime_name || 'Unknown' };
    }
  } catch {}

  try {
    const res2 = await axios.get(`https://api.otakugifs.xyz/gif?reaction=${apiReaction}`, { timeout: 5000 });
    if (res2.data?.url) {
      return { url: res2.data.url, animeName: 'Unknown' };
    }
  } catch {}

  return { url: fallbackGifs[reaction] || fallbackGifs['hug'], animeName: 'Unknown' };
}

module.exports = { fetchGif };
