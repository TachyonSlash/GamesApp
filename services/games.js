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

const FEATURED_COMPANY_NAMES = [
  'Nintendo',
  'Sony',
  'Sony Interactive Entertainment',
  'Microsoft',
  'Xbox Game Studios',
  'Sega',
  'Capcom',
  'Square Enix',
  'Bandai Namco',
  'Konami',
  'Ubisoft',
  'Electronic Arts',
  'Take-Two',
  'Rockstar Games',
  'Bethesda',
  'Valve',
  'Atari',
  'Activision',
  'Blizzard',
  'Naughty Dog',
  'Insomniac Games',
];

const FEATURED_ANTICIPATED_GAME_ID = 405450;
const FEATURED_ANTICIPATED_GAME_FALLBACK = {
  id: FEATURED_ANTICIPATED_GAME_ID,
  name: 'Xenoblade Genesis',
  summary: 'A new beginning for the Xenoblade series is coming to Nintendo Switch 2 in 2027.',
  cover: {
    url: '//images.igdb.com/igdb/image/upload/t_cover_big_2x/coc8ai.jpg',
  },
  first_release_date: null,
  genres: [],
  platforms: [],
};

const DEFAULT_HEADERS = {
  'Client-ID': CLIENT_ID,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

const catalogCache = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCachedCatalog(key, loader) {
  if (catalogCache.has(key)) {
    return catalogCache.get(key);
  }

  const promise = loader().catch((error) => {
    catalogCache.delete(key);
    throw error;
  });

  catalogCache.set(key, promise);
  return promise;
}

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

async function hydrateGamesByIds(gameIds, extraById = new Map()) {
  const uniqueGameIds = [...new Set(gameIds.filter((gameId) => typeof gameId === 'number'))];

  if (uniqueGameIds.length === 0) {
    return [];
  }

  const games = await igdbRequest('games', `${GAME_FIELDS} where id = (${uniqueGameIds.join(',')});`);
  const gamesById = new Map((Array.isArray(games) ? games : []).map((game) => [game.id, game]));

  return uniqueGameIds
    .map((gameId) => {
      const game = gamesById.get(gameId);

      if (!game) {
        return null;
      }

      return {
        ...game,
        ...extraById.get(gameId),
      };
    })
    .filter(Boolean);
}

async function fetchAllPages(path, fields, pageSize = 100, pauseMs = 275) {
  const results = [];
  let offset = 0;

  while (true) {
    const page = await igdbRequest(
      path,
      `fields ${fields}; sort name asc; limit ${pageSize}; offset ${offset};`
    );

    const items = Array.isArray(page) ? page : [];
    results.push(...items);

    if (items.length < pageSize) {
      break;
    }

    offset += pageSize;

    if (pauseMs > 0) {
      await delay(pauseMs);
    }
  }

  return results;
}

function normalizeIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? [normalizedValue] : [];
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function prioritizeCompanies(items, limit) {
  const seen = new Set();
  const prioritized = [];
  const rest = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.id || seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    const name = normalizeText(item.name);
    const priorityIndex = FEATURED_COMPANY_NAMES.findIndex((companyName) =>
      name.includes(normalizeText(companyName))
    );

    if (priorityIndex !== -1) {
      prioritized.push({ item, priorityIndex });
      continue;
    }

    rest.push(item);
  }

  prioritized.sort((left, right) => {
    if (left.priorityIndex !== right.priorityIndex) {
      return left.priorityIndex - right.priorityIndex;
    }

    return String(left.item.name ?? '').localeCompare(String(right.item.name ?? ''));
  });

  rest.sort((left, right) => String(left.name ?? '').localeCompare(String(right.name ?? '')));

  return prioritized.map((entry) => entry.item).concat(rest).slice(0, limit);
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

export function getPopularGames(limit = 10) {
  return igdbRequest(
    'popularity_primitives',
    `fields game_id,value,popularity_type; where popularity_type = 3 & game_id != null; sort value desc; limit ${limit};`
  ).then(async (items) => {
    const popularityItems = Array.isArray(items) ? items : [];
    const gameIds = popularityItems
      .map((item) => item?.game_id)
      .filter((gameId) => typeof gameId === 'number');

    const extraById = new Map(
      popularityItems.map((item) => [item.game_id, { popularity_value: item.value, popularity_type: item.popularity_type }])
    );

    return hydrateGamesByIds(gameIds, extraById);
  });
}

export function getTop100Games() {
  return igdbRequest(
    'games',
    `${GAME_FIELDS} where aggregated_rating != null & aggregated_rating_count >= 5 & cover != null; sort aggregated_rating desc; limit 100;`
  );
}

export function getComingSoonGames(limit = 20) {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);

  return igdbRequest(
    'release_dates',
    `fields date,human,game; where date != null & game != null & date > ${currentUnixTimestamp}; sort date asc; limit 100;`
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

      if (gameIds.length >= limit) {
        break;
      }
    }

    return hydrateGamesByIds(gameIds, releaseInfoByGameId);
  });
}

export function getMostAnticipatedGames(limit = 20) {
  const currentUnixTimestamp = Math.floor(Date.now() / 1000);

  return Promise.all([
    getGameById(FEATURED_ANTICIPATED_GAME_ID),
    igdbRequest(
      'games',
      `fields id,name,summary,first_release_date,cover.url,total_rating,genres.name,platforms.name,hypes; where first_release_date != null & first_release_date >= ${currentUnixTimestamp} & hypes != null; sort hypes desc; limit 100;`
    ),
  ]).then(async ([featuredGameResponse, anticipatedResponse]) => {
    const featuredGame = featuredGameResponse ? { ...featuredGameResponse } : FEATURED_ANTICIPATED_GAME_FALLBACK;
    const anticipatedGames = Array.isArray(anticipatedResponse) ? anticipatedResponse : [];
    const combinedGames = [featuredGame, ...anticipatedGames].filter(Boolean);
    const uniqueGames = [];
    const seen = new Set();

    for (const game of combinedGames) {
      const key = String(game?.id ?? game?.name ?? '');

      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      uniqueGames.push(game);

      if (uniqueGames.length >= limit) {
        break;
      }
    }

    return uniqueGames;
  });
}

export function getRandomGame() {
  return igdbRequest(
    'games',
    `${GAME_FIELDS} where cover != null; limit 100;`
  ).then((items) => {
    const games = Array.isArray(items) ? items : [];

    if (games.length === 0) {
      return [];
    }

    const randomGame = games[Math.floor(Math.random() * games.length)];
    return randomGame ? [randomGame] : [];
  });
}

export function getGamesByGenre(genreId) {
  const genreIds = normalizeIdList(genreId);

  if (genreIds.length === 0) {
    return Promise.resolve([]);
  }

  return igdbRequest(
    'games',
    `${GAME_FIELDS} where genres = (${genreIds.join(',')}); sort first_release_date desc; limit 100;`
  );
}

export function getGamesByPlatform(platformId) {
  const platformIds = normalizeIdList(platformId);

  if (platformIds.length === 0) {
    return Promise.resolve([]);
  }

  return igdbRequest(
    'games',
    `${GAME_FIELDS} where platforms = (${platformIds.join(',')}); sort first_release_date desc; limit 100;`
  );
}

export function getGamesByCompany(companyId, role = 'company') {
  const companyIds = normalizeIdList(companyId);
  const normalizedCompanyId = companyIds.join(',');
  const roleClause = role === 'developer' ? ' & involved_companies.developer = true' : role === 'publisher' ? ' & involved_companies.publisher = true' : '';

  if (companyIds.length === 0) {
    return Promise.resolve([]);
  }

  return igdbRequest(
    'games',
    `${GAME_FIELDS} where involved_companies.company = ${normalizedCompanyId}${roleClause}; sort first_release_date desc; limit 100;`
  );
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

export function getCompanies(query = '', limit = 100) {
  const normalizedQuery = String(query).trim();

  if (normalizedQuery.length > 0) {
    const safeQuery = normalizedQuery.replace(/"/g, '\\"');

    return igdbRequest(
      'companies',
      `fields id,name,slug; where name ~ *"${safeQuery}"*; sort name asc; limit ${limit};`
    );
  }

  return getCachedCatalog(`companies:${limit}`, async () => {
    const items = await igdbRequest('companies', 'fields id,name,slug; sort name asc; limit 500;');
    return prioritizeCompanies(items, limit);
  });
}

export function getFranchises() {
  return getCachedCatalog('franchises', () => fetchAllPages('franchises', 'id,name,slug'));
}

export function getGameTimeToBeats() {
  return getCachedCatalog('game_time_to_beats', () => fetchAllPages('game_time_to_beats', 'id,name,slug'));
}

export function getGenres() {
  return getCachedCatalog('genres', () => fetchAllPages('genres', 'id,name,slug'));
}

export function getLanguageSupports() {
  return getCachedCatalog('language_supports', () => fetchAllPages('language_supports', 'id,name,slug'));
}

export function getPlatforms() {
  return getCachedCatalog('platforms', () => fetchAllPages('platforms', 'id,name,abbreviation'));
}

export function getKeywords() {
  return getCachedCatalog('keywords', () => fetchAllPages('keywords', 'id,name,slug'));
}

export function getReleaseDates() {
  return getCachedCatalog('release_dates', () => fetchAllPages('release_dates', 'id,human,date'));
}

export function getPopularityTypes() {
  return getCachedCatalog('popularity_types', () => fetchAllPages('popularity_types', 'id,name'));
}