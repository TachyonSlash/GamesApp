const BASE_URL = 'https://api.igdb.com/v4';

const CLIENT_ID = process.env.EXPO_PUBLIC_IGDB_CLIENT_ID;
const ACCESS_TOKEN = process.env.EXPO_PUBLIC_IGDB_ACCESS_TOKEN;

if (!CLIENT_ID || !ACCESS_TOKEN) {
  throw new Error('Faltan credenciales de IGDB en el archivo .env');
}

const GAME_FIELDS =
  'fields id,name,summary,first_release_date,cover.url,total_rating,genres.name,platforms.name;';

const GAME_DETAIL_FIELDS =
  'fields id,name,summary,storyline,first_release_date,cover.url,total_rating,aggregated_rating,rating,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,franchises.name,game_modes.name,themes.name,player_perspectives.name,screenshots.url,screenshots.image_id,artworks.url,artworks.image_id,release_dates.date,release_dates.human,release_dates.platform.name,version_parent.name;';

const DEFAULT_HEADERS = {
  'Client-ID': CLIENT_ID,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

async function igdbRequest(path, body = '', options = {}) {
  const response = await fetch(`${BASE_URL}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      ...DEFAULT_HEADERS,
      ...options.headers,
    },
    body,
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`IGDB error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export function searchGames(query = '') {
  const safeQuery = query.trim().replace(/"/g, '\\"');

  const body = `
    ${GAME_FIELDS}
    search "${safeQuery}";
    limit 20;
  `;

  return igdbRequest('games', body);
}

export function getGames() {
  return igdbRequest(
    'games',
    `${GAME_FIELDS} sort first_release_date desc; limit 20;`
  );
}

export function getGameById(id) {
  const gameId = Number(id);

  if (!Number.isFinite(gameId)) {
    return Promise.resolve(null);
  }

  return igdbRequest('games', `${GAME_DETAIL_FIELDS} where id = ${gameId}; limit 1;`).then((items) =>
    (Array.isArray(items) ? items[0] ?? null : null)
  );
}

export function getPopularGames() {
  return igdbRequest(
    'popularity_primitives',
    'fields game_id,value,popularity_type; where popularity_type = 3 & game_id != null; sort value desc; limit 10;'
  ).then(async (items) => {
    const popularityItems = Array.isArray(items) ? items : [];
    const gameIds = popularityItems
      .map((item) => item?.game_id)
      .filter((gameId) => typeof gameId === 'number');

    if (gameIds.length === 0) {
      return [];
    }

    const games = await igdbRequest(
      'games',
      `${GAME_FIELDS} where id = (${gameIds.join(',')});`
    );

    const gamesById = new Map(
      (Array.isArray(games) ? games : []).map((game) => [game.id, game])
    );

    return popularityItems
      .map((item) => {
        const game = gamesById.get(item.game_id);

        if (!game) {
          return null;
        }

        return {
          ...game,
          popularity_value: item.value,
          popularity_type: item.popularity_type,
        };
      })
      .filter(Boolean);
  });
}

export function getRecentGames() {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);

  return igdbRequest(
    'release_dates',
    `fields date,human,game; where date != null & game != null & date < ${currentUnixTimestamp}; sort date desc; limit 100;`
  ).then(async (items) => {
    const releaseDates = Array.isArray(items) ? items : [];
    const releaseInfoByGameId = new Map();
    const gameIds = [];

    for (const item of releaseDates) {
      const gameId = item?.game;

      if (!gameId || releaseInfoByGameId.has(gameId)) {
        continue;
      }

      releaseInfoByGameId.set(gameId, {
        release_date: item.date,
        release_human: item.human,
      });
      gameIds.push(gameId);

      if (gameIds.length >= 20) {
        break;
      }
    }

    if (gameIds.length === 0) {
      return [];
    }

    const games = await igdbRequest(
      'games',
      `${GAME_FIELDS} where id = (${gameIds.join(',')});`
    );

    const gamesById = new Map(
      (Array.isArray(games) ? games : []).map((game) => [game.id, game])
    );

    return gameIds
      .map((gameId) => {
        const game = gamesById.get(gameId);
        if (!game) {
          return null;
        }

        return {
          ...game,
          ...releaseInfoByGameId.get(gameId),
        };
      })
      .filter(Boolean);
  });
}

export function getCompanies() {
  return igdbRequest('companies', 'fields id,name,slug; limit 20;');
}

export function getFranchises() {
  return igdbRequest('franchises', 'fields id,name,slug; limit 20;');
}

export function getGameTimeToBeats() {
  return igdbRequest('game_time_to_beats', 'fields id,name,slug; limit 20;');
}

export function getGenres() {
  return igdbRequest('genres', 'fields id,name,slug; limit 50;');
}

export function getLanguageSupports() {
  return igdbRequest('language_supports', 'fields id,name,slug; limit 50;');
}

export function getPlatforms() {
  return igdbRequest('platforms', 'fields id,name,abbreviation; limit 50;');
}

export function getKeywords() {
  return igdbRequest('keywords', 'fields id,name,slug; limit 50;');
}

export function getReleaseDates() {
  return igdbRequest('release_dates', 'fields id,human,date; limit 50;');
}

export function getPopularityTypes() {
  return igdbRequest('popularity_types', 'fields id,name; limit 20;');
}