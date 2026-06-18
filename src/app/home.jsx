import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import FilterMenu from '../../components/filterMenu';
import GameShelf from '../../components/gameShelf';
import {
  getComingSoonGames,
  getCompanies,
  getGamesByCompany,
  getGamesByGenre,
  getGamesByPlatform,
  getGenres,
  getPopularGames,
  getRandomGame,
  getRecentGames,
  getTop100Games,
  getPlatforms,
  searchGames,
} from '../../services/games';

const CATALOG_LABELS = {
  genre: 'Géneros',
  platform: 'Plataformas',
  company: 'Compañías',
  developer: 'Desarrolladoras',
};

export default function Home() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [catalogType, setCatalogType] = useState('genre');
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSelection, setCatalogSelection] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [error, setError] = useState('');

  async function loadFilterResults(filter) {
    switch (filter.type) {
      case 'top100':
        return getTop100Games();
      case 'comingSoon':
        return getComingSoonGames();
      case 'recentlyReleased':
        return getRecentGames();
      case 'random':
        return getRandomGame();
      case 'genre':
        return getGamesByGenre(filter.ids ?? filter.id);
      case 'platform':
        return getGamesByPlatform(filter.ids ?? filter.id);
      case 'company':
        return getGamesByCompany(filter.ids ?? filter.id, 'company');
      case 'developer':
        return getGamesByCompany(filter.ids ?? filter.id, 'developer');
      default:
        return [];
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadGames() {
      try {
        setLoading(true);
        setError('');

        const query = searchText.trim();

        if (query.length > 0) {
          const results = await searchGames(query);
          setSearchResults(Array.isArray(results) ? results : []);
          setPopularGames([]);
          setRecentGames([]);
          setFilteredGames([]);
          return;
        }

        if (activeFilter) {
          const results = await loadFilterResults(activeFilter);
          setFilteredGames(Array.isArray(results) ? results : []);
          setSearchResults([]);
          setPopularGames([]);
          setRecentGames([]);
          return;
        }

        const [popularData, recentData] = await Promise.all([getPopularGames(10), getRecentGames()]);
        setSearchResults([]);
        setFilteredGames([]);
        setPopularGames(Array.isArray(popularData) ? popularData : []);
        setRecentGames(Array.isArray(recentData) ? recentData : []);
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Ocurrió un error al cargar los juegos.');
          setSearchResults([]);
          setPopularGames([]);
          setRecentGames([]);
          setFilteredGames([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadGames();

    return () => controller.abort();
  }, [searchText, refreshIndex, activeFilter]);

  const activeFilterLabel = activeFilter?.label ?? '';

  const catalogVisibleItems = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();

    if (!query) {
      return catalogItems;
    }

    return catalogItems.filter((item) => String(item?.name ?? '').toLowerCase().includes(query));
  }, [catalogItems, catalogQuery]);

  useEffect(() => {
    if (!catalogVisible) {
      return undefined;
    }

    if (catalogType !== 'company' && catalogType !== 'developer') {
      return undefined;
    }

    const query = catalogQuery.trim();
    if (query.length === 0) {
      return undefined;
    }

    const debounceId = setTimeout(async () => {
      try {
        setCatalogLoading(true);
        const results = await getCompanies(query, 50);
        setCatalogItems(Array.isArray(results) ? results : []);
      } catch (catalogError) {
        setError(catalogError.message || 'No se pudo cargar el catálogo.');
      } finally {
        setCatalogLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceId);
  }, [catalogVisible, catalogType, catalogQuery]);

  function handleRefresh() {
    setRefreshIndex((value) => value + 1);
  }

  async function openCatalogPicker(type) {
    setMenuVisible(false);
    setCatalogType(type);
    setCatalogQuery('');
    setCatalogItems([]);
    setCatalogSelection([]);
    setCatalogVisible(true);
    setCatalogLoading(true);

    try {
      let items = [];

      if (type === 'genre') {
        items = await getGenres();
      } else if (type === 'platform') {
        items = await getPlatforms();
      } else {
        items = await getCompanies('', 100);
      }

      setCatalogItems(Array.isArray(items) ? items : []);
    } catch (catalogError) {
      setError(catalogError.message || 'No se pudo cargar el catálogo.');
    } finally {
      setCatalogLoading(false);
    }
  }

  async function handleMenuAction(actionKey) {
    setMenuVisible(false);

    if (actionKey === 'refresh') {
      handleRefresh();
      return;
    }

    if (actionKey === 'top100') {
      setActiveFilter({ type: 'top100', label: 'Top 100' });
      return;
    }

    if (actionKey === 'comingSoon') {
      setActiveFilter({ type: 'comingSoon', label: 'Coming Soon' });
      return;
    }

    if (actionKey === 'recentlyReleased') {
      setActiveFilter({ type: 'recentlyReleased', label: 'Recently Released' });
      return;
    }

    if (actionKey === 'random') {
      setActiveFilter({ type: 'random', label: 'Juego random' });
      return;
    }

    if (['genre', 'platform', 'company', 'developer'].includes(actionKey)) {
      await openCatalogPicker(actionKey);
    }
  }

  function toggleCatalogItem(item) {
    const itemId = item?.id;

    if (!itemId) {
      return;
    }

    setCatalogSelection((currentSelection) => {
      if (currentSelection.some((selectedItem) => selectedItem.id === itemId)) {
        return currentSelection.filter((selectedItem) => selectedItem.id !== itemId);
      }

      return [...currentSelection, { id: itemId, name: item?.name ?? 'Sin nombre' }];
    });
  }

  function applyCatalogSelection() {
    if (catalogSelection.length === 0) {
      setCatalogVisible(false);
      return;
    }

    const ids = catalogSelection.map((item) => item.id);
    const names = catalogSelection.map((item) => item.name);
    const labelPrefix = CATALOG_LABELS[catalogType] ?? 'Filtro';

    setActiveFilter({
      type: catalogType,
      ids,
      label: `${labelPrefix}: ${names.join(', ')}`,
    });
    setCatalogVisible(false);
  }

  function clearFilter() {
    setActiveFilter(null);
    setFilteredGames([]);
    setCatalogVisible(false);
  }

  function isCatalogItemSelected(itemId) {
    return catalogSelection.some((selectedItem) => selectedItem.id === itemId);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          GamesApp
        </ThemedText>

        <View style={styles.searchRow}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar videojuegos"
            placeholderTextColor={Colors.dark.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />

          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <ThemedText type="smallBold" style={styles.refreshText}>
              Filtrar
            </ThemedText>
          </Pressable>
        </View>

        {activeFilterLabel ? (
          <View style={styles.activeFilterRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Filtro activo:
            </ThemedText>
            <View style={styles.activeFilterChip}>
              <ThemedText type="smallBold">{activeFilterLabel}</ThemedText>
            </View>
            <Pressable onPress={clearFilter} style={styles.clearFilterButton}>
              <ThemedText type="smallBold">Limpiar</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <ThemedView style={styles.statusBox}>
            <ThemedText type="smallBold">{error}</ThemedText>
          </ThemedView>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />
            <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
              Cargando juegos...
            </ThemedText>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {searchText.trim().length > 0 ? (
              <GameShelf
                title="Resultados de búsqueda"
                data={searchResults}
                emptyTitle="No hay resultados"
                emptyDescription="Prueba con otro nombre de juego."
              />
            ) : activeFilter ? (
              <GameShelf
                title={activeFilterLabel}
                data={filteredGames}
                emptyTitle="Sin resultados"
                emptyDescription="Prueba con otro filtro o limpia la selección actual."
              />
            ) : (
              <>
                <GameShelf
                  title="Juegos populares"
                  data={popularGames}
                  horizontal
                  emptyDescription="Prueba con otra búsqueda o actualiza los datos."
                />

                <GameShelf
                  title="Juegos recientes"
                  data={recentGames}
                  emptyDescription="Prueba con otra búsqueda o actualiza los datos."
                />
              </>
            )}
          </ScrollView>
        )}

        <FilterMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onSelectAction={handleMenuAction}
        />

        <Modal visible={catalogVisible} transparent animationType="fade" onRequestClose={() => setCatalogVisible(false)}>
          <Pressable style={styles.catalogBackdrop} onPress={() => setCatalogVisible(false)}>
            <Pressable style={styles.catalogCard} onPress={() => {}}>
              <View style={styles.catalogHeader}>
                <ThemedText type="subtitle">{CATALOG_LABELS[catalogType]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Puedes seleccionar varios elementos y aplicar al final.
                </ThemedText>
              </View>

              {catalogLoading ? (
                <View style={styles.catalogLoading}>
                  <ActivityIndicator size="small" />
                </View>
              ) : (
                <>
                  <TextInput
                    value={catalogQuery}
                    onChangeText={setCatalogQuery}
                    placeholder="Buscar en la lista"
                    placeholderTextColor={Colors.dark.textSecondary}
                    style={styles.catalogSearch}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />

                  <ScrollView showsVerticalScrollIndicator={false} style={styles.catalogList}>
                    {catalogVisibleItems.map((item) => (
                      <Pressable
                        key={String(item.id)}
                        onPress={() => toggleCatalogItem(item)}
                        style={({ pressed }) => [styles.catalogItem, pressed && styles.pressed]}
                      >
                        <ThemedText type="smallBold">
                          {isCatalogItemSelected(item.id) ? '✓ ' : ''}
                          {item.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.catalogActions}>
                <Pressable onPress={() => setCatalogVisible(false)} style={styles.catalogClose}>
                  <ThemedText type="smallBold">Cerrar</ThemedText>
                </Pressable>

                <Pressable onPress={applyCatalogSelection} style={styles.catalogApply}>
                  <ThemedText type="smallBold">Aplicar</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
    fontSize: 16,
  },
  refreshButton: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
  },
  refreshText: {
    color: Colors.dark.text,
  },
  pressed: {
    opacity: 0.7,
  },
  statusBox: {
    padding: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.dark.backgroundElement,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  loadingText: {
    marginTop: Spacing.one,
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  activeFilterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Colors.dark.backgroundElement,
  },
  clearFilterButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Colors.dark.backgroundElement,
  },
  catalogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  catalogCard: {
    maxHeight: '82%',
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  catalogHeader: {
    gap: Spacing.one,
  },
  catalogLoading: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  catalogSearch: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.dark.backgroundElement,
    color: Colors.dark.text,
  },
  catalogList: {
    maxHeight: 340,
  },
  catalogItem: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.dark.backgroundElement,
    marginBottom: Spacing.two,
  },
  catalogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  catalogClose: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: Colors.dark.backgroundElement,
  },
  catalogApply: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: '#6b5cff',
  },
});