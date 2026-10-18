/**
 * RadioMetadataService
 * Fetches live stream metadata for Laut.fm, Nightwave Plaza, SomaFM, and ICY streams.
 */

async function fetchNowPlaying(streamUrl, stationId) {
  const url = String(streamUrl || '');
  const id = String(stationId || '');

  // 1. Laut.fm streams
  if (url.includes('laut.fm') || id === 'anime-fm' || id === 'initial-d-world' || id === 'dragon-beats' || id === 'lofi-cafe') {
    let stName = 'animefm';
    if (id === 'initial-d-world' || url.includes('eurobeat')) stName = 'eurobeat';
    else if (id === 'dragon-beats' || url.includes('synthwave')) stName = 'synthwave';
    else if (id === 'lofi-cafe' || url.includes('lofi')) stName = 'lofi';
    else if (url.includes('laut.fm')) {
      const parts = url.split('/');
      stName = parts[parts.length - 1] || parts[parts.length - 2];
    }

    try {
      const lautRes = await fetch(`https://api.laut.fm/station/${encodeURIComponent(stName)}/current_song`, {
        headers: { 'User-Agent': 'KansoCre8/0.1' },
        signal: AbortSignal.timeout(3500)
      });
      if (lautRes.ok) {
        const data = await lautRes.json();
        if (data?.title) {
          const artist = data.artist?.name || '';
          const trackTitle = artist ? `${artist} — ${data.title}` : data.title;
          return { success: true, trackTitle, artist, title: data.title, source: 'laut.fm' };
        }
      }
    } catch (e) {}
  }

  // 2. Nightwave Plaza
  if (url.includes('plaza.one') || id === 'nightwave-plaza') {
    try {
      const plazaRes = await fetch('https://api.plaza.one/status', {
        headers: { 'User-Agent': 'KansoCre8/0.1' },
        signal: AbortSignal.timeout(3500)
      });
      if (plazaRes.ok) {
        const data = await plazaRes.json();
        if (data?.song?.title) {
          const artist = data.song.artist || '';
          const trackTitle = artist ? `${artist} — ${data.song.title}` : data.song.title;
          return { success: true, trackTitle, artist, title: data.song.title, source: 'plaza.one' };
        }
      }
    } catch (e) {}
  }

  // 3. SomaFM streams
  if (url.includes('somafm.com') || id === 'groove-salad') {
    try {
      const match = url.match(/somafm\.com\/([a-zA-Z0-9]+)/);
      const channel = match ? match[1].replace('-256-mp3', '').replace('-128-mp3', '') : 'groovesalad';
      const somaRes = await fetch(`https://somafm.com/songs/${encodeURIComponent(channel)}.json`, {
        headers: { 'User-Agent': 'KansoCre8/0.1' },
        signal: AbortSignal.timeout(3500)
      });
      if (somaRes.ok) {
        const data = await somaRes.json();
        const song = data?.songs?.[0];
        if (song?.title) {
          const artist = song.artist || '';
          const trackTitle = artist ? `${artist} — ${song.title}` : song.title;
          return { success: true, trackTitle, artist, title: song.title, source: 'somafm' };
        }
      }
    } catch (e) {}
  }

  // 4. ICY metadata reader for generic Icecast / Shoutcast streams
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const httpLib = url.startsWith('https') ? require('https') : require('http');
    const icyPromise = new Promise((resolve) => {
      const request = httpLib.get(url, {
        headers: { 'Icy-MetaData': '1', 'User-Agent': 'KansoCre8/0.1' },
        timeout: 4000
      }, (streamRes) => {
        if ([301, 302, 307, 308].includes(streamRes.statusCode) && streamRes.headers.location) {
          streamRes.destroy();
          return resolve(null);
        }
        const metaint = parseInt(streamRes.headers['icy-metaint']);
        if (!metaint || isNaN(metaint)) {
          streamRes.destroy();
          return resolve(null);
        }
        let bytesRead = 0;
        let metaLength = 0;
        let metaBuffer = Buffer.alloc(0);
        let state = 'audio';

        streamRes.on('data', (chunk) => {
          let offset = 0;
          while (offset < chunk.length) {
            if (state === 'audio') {
              const needed = metaint - bytesRead;
              const available = chunk.length - offset;
              if (available < needed) {
                bytesRead += available;
                offset = chunk.length;
              } else {
                bytesRead = 0;
                offset += needed;
                state = 'metaLength';
              }
            } else if (state === 'metaLength') {
              metaLength = chunk[offset] * 16;
              offset++;
              metaBuffer = Buffer.alloc(0);
              if (metaLength === 0) {
                state = 'audio';
              } else {
                state = 'meta';
              }
            } else if (state === 'meta') {
              const needed = metaLength - metaBuffer.length;
              const available = chunk.length - offset;
              const toRead = Math.min(needed, available);
              metaBuffer = Buffer.concat([metaBuffer, chunk.slice(offset, offset + toRead)]);
              offset += toRead;
              if (metaBuffer.length >= metaLength) {
                const str = metaBuffer.toString('utf8');
                const match = str.match(/StreamTitle='([^']*)'/);
                streamRes.destroy();
                return resolve(match ? match[1] : null);
              }
            }
          }
        });
      });

      request.on('error', () => resolve(null));
      request.on('timeout', () => { request.destroy(); resolve(null); });
    });

    const icyTitle = await icyPromise;
    if (icyTitle) {
      return { success: true, trackTitle: icyTitle, source: 'icy' };
    }
  }

  return { success: true, trackTitle: null, message: 'No live ICY or station metadata stream found' };
}

module.exports = {
  fetchNowPlaying
};
