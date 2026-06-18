import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import GameCard from '../../components/gameCard';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { getPopularGames, getRecentGames, searchGames } from '../../services/games';

export default function Home() {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [error, setError] = useState('');

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
        } else {
          const [popularData, recentData] = await Promise.all([
            getPopularGames(),
            getRecentGames(),
          ]);

          const popularItems = Array.isArray(popularData) ? popularData : [];
          const recentItems = Array.isArray(recentData) ? recentData : [];

          setSearchResults([]);
          setPopularGames(popularItems);
          setRecentGames(recentItems);
        }
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Ocurrió un error al cargar los juegos.');
          setSearchResults([]);
          setPopularGames([]);
          setRecentGames([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadGames();

    return () => controller.abort();
  }, [searchText, refreshIndex]);

  const handleRefresh = () => {
    setRefreshIndex((value) => value + 1);
  };

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
            onPress={handleRefresh}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <ThemedText type="smallBold" style={styles.refreshText}>
              Actualizar
            </ThemedText>
          </Pressable>
        </View>

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
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Resultados de búsqueda</ThemedText>
                </View>

                <FlatList
                  data={searchResults}
                  scrollEnabled={false}
                  keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
                  renderItem={({ item }) => <GameCard item={item} />}
                  contentContainerStyle={styles.recentList}
                  ListEmptyComponent={
                    <ThemedView style={styles.emptyState}>
                      <ThemedText type="subtitle" style={styles.emptyTitle}>
                        No hay resultados
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Prueba con otro nombre de juego.
                      </ThemedText>
                    </ThemedView>
                  }
                />
              </>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Juegos populares</ThemedText>
                </View>

                <FlatList
                  data={popularGames.slice(0, 10)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
                  renderItem={({ item }) => <GameCard item={item} horizontal />}
                  contentContainerStyle={styles.popularList}
                />

                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Juegos recientes</ThemedText>
                </View>

                <FlatList
                  data={recentGames}
                  scrollEnabled={false}
                  keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
                  renderItem={({ item }) => <GameCard item={item} />}
                  contentContainerStyle={styles.recentList}
                  ListEmptyComponent={
                    <ThemedView style={styles.emptyState}>
                      <ThemedText type="subtitle" style={styles.emptyTitle}>
                        No hay resultados
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Prueba con otra búsqueda o actualiza los datos.
                      </ThemedText>
                    </ThemedView>
                  }
                />
              </>
            )}
          </ScrollView>
        )}
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
  sectionHeader: {
    marginTop: Spacing.one,
  },
  popularList: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  recentList: {
    gap: Spacing.three,
  },
  emptyState: {
    padding: Spacing.four,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundElement,
    gap: Spacing.one,
  },
  emptyTitle: {
    marginBottom: Spacing.one,
  },
});