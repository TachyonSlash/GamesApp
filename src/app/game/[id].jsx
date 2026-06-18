import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { getGameById } from '../../../services/games';

function getImageUrl(image) {
  if (!image?.url) {
    return null;
  }

  return `https:${image.url.replace('t_thumb', 't_1080p')}`;
}

function getYear(timestamp) {
  if (!timestamp) {
    return '';
  }

  return new Date(timestamp * 1000).getFullYear();
}

function formatList(values) {
  return values.filter(Boolean).join(', ');
}

export default function GameDetailsScreen() {
  const { id } = useLocalSearchParams();
  const gameId = Array.isArray(id) ? id[0] : id;
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadGame() {
      try {
        setLoading(true);
        setError('');

        const data = await getGameById(gameId);

        if (isActive) {
          setGame(data);
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError.message || 'No se pudo cargar el juego.');
          setGame(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadGame();

    return () => {
      isActive = false;
    };
  }, [gameId]);

  const screenshots = useMemo(() => game?.screenshots ?? [], [game]);
  const releaseDates = useMemo(() => game?.release_dates ?? [], [game]);
  const genreNames = useMemo(() => game?.genres?.map((genre) => genre?.name) ?? [], [game]);
  const platformNames = useMemo(() => game?.platforms?.map((platform) => platform?.name) ?? [], [game]);
  const themeNames = useMemo(() => game?.themes?.map((theme) => theme?.name) ?? [], [game]);
  const perspectiveNames = useMemo(
    () => game?.player_perspectives?.map((perspective) => perspective?.name) ?? [],
    [game]
  );
  const gameModeNames = useMemo(() => game?.game_modes?.map((mode) => mode?.name) ?? [], [game]);
  const franchiseNames = useMemo(() => game?.franchises?.map((franchise) => franchise?.name) ?? [], [game]);
  const developerNames = useMemo(
    () =>
      game?.involved_companies
        ?.filter((entry) => entry?.developer && entry?.company?.name)
        .map((entry) => entry.company.name) ?? [],
    [game]
  );
  const publisherNames = useMemo(
    () =>
      game?.involved_companies
        ?.filter((entry) => entry?.publisher && entry?.company?.name)
        .map((entry) => entry.company.name) ?? [],
    [game]
  );
  const companyNames = useMemo(
    () =>
      game?.involved_companies
        ?.map((entry) => {
          const companyName = entry?.company?.name;
          if (!companyName) {
            return null;
          }

          return entry.developer ? `Dev: ${companyName}` : entry.publisher ? `Pub: ${companyName}` : companyName;
        })
        .filter(Boolean) ?? [],
    [game]
  );

  const coverUrl = getImageUrl(game?.cover);
  const releaseYear = getYear(game?.release_date ?? game?.first_release_date);
  const score = game?.total_rating ? game.total_rating.toFixed(1) : 'N/A';
  const secondaryScore = game?.aggregated_rating ? game.aggregated_rating.toFixed(1) : 'N/A';
  const releaseLabel = game?.release_human ?? releaseDates[0]?.human ?? (releaseYear ? String(releaseYear) : '');
  const mainStudio = developerNames[0] ?? publisherNames[0] ?? companyNames[0] ?? '-';
  const mainDescription = game?.storyline || game?.summary || 'Sin descripción disponible.';

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" />
            <ThemedText type="small" themeColor="textSecondary">
              Cargando detalles...
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error || !game) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorBox}>
            <ThemedText type="subtitle">No se pudo cargar el juego</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error || 'Intenta volver a abrir la card desde el home.'}
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
              <ThemedText type="smallBold" style={styles.backButtonText}>
                {'<'}
              </ThemedText>
            </Pressable>
            <View style={styles.headerTextWrap}>
              <ThemedText type="title" style={styles.gameTitle} numberOfLines={2}>
                {game.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {releaseLabel ? `${releaseLabel} • ` : ''}{mainStudio}
              </ThemedText>
            </View>
            <View style={styles.topBarSpacer} />
          </View>

          <View style={styles.card}>
            <View style={styles.coverRow}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={styles.coverPlaceholder} />
              )}

              <View style={styles.metaColumn}>
                <FieldGroup title="Genre" value={formatList(genreNames) || 'Sin género'} />
                <FieldGroup title="Platforms" value={formatList(platformNames) || 'Sin plataformas'} />
              </View>
            </View>
          </View>

          <View style={styles.scoreGrid}>
            <View style={styles.scoreCard}>
              <ThemedText type="smallBold" style={styles.scoreValue}>
                {score}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                User ratings
              </ThemedText>
            </View>
            <View style={styles.scoreCard}>
              <ThemedText type="smallBold" style={styles.scoreValue}>
                {secondaryScore}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Critic ratings
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="default" style={styles.bodyText}>
              {mainDescription}
            </ThemedText>
          </View>

          {screenshots.length > 0 ? (
            <View style={styles.section}>
              <ThemedText type="smallBold">Screenshots</ThemedText>
              <FlatList
                data={screenshots.slice(0, 6)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => String(item?.id ?? index)}
                contentContainerStyle={styles.screenshotList}
                renderItem={({ item }) => {
                  const screenshotUrl = getImageUrl(item);

                  return screenshotUrl ? (
                    <Image source={{ uri: screenshotUrl }} style={styles.screenshot} contentFit="cover" />
                  ) : null;
                }}
              />
            </View>
          ) : null}

          <View style={styles.detailGrid}>
            <DetailBlock title="Release date" value={releaseLabel || '-'} />
            <DetailBlock title="Main developers" value={formatList(developerNames)} />
            <DetailBlock title="Publishers" value={formatList(publisherNames)} />
            <DetailBlock title="Supporting info" value={formatList(companyNames)} />
            <DetailBlock title="Game modes" value={formatList(gameModeNames)} />
            <DetailBlock title="Player perspectives" value={formatList(perspectiveNames)} />
            <DetailBlock title="Themes" value={formatList(themeNames)} />
            <DetailBlock title="Franchises" value={formatList(franchiseNames)} />
            <DetailBlock title="Platforms" value={formatList(platformNames)} />
            <DetailBlock title="Screenshots" value={`${screenshots.length} available`} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FieldGroup({ title, value }) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

function DetailBlock({ title, value }) {
  return (
    <View style={styles.detailBlock}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value || '-'}
      </ThemedText>
    </View>
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
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  topBarSpacer: {
    width: 26,
    height: 26,
  },
  backButton: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    lineHeight: 20,
  },
  headerTextWrap: {
    flex: 1,
    gap: Spacing.one,
  },
  gameTitle: {
    fontSize: 34,
    lineHeight: 38,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  coverRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  cover: {
    width: 96,
    height: 136,
    borderRadius: 16,
    backgroundColor: Colors.dark.backgroundSelected,
  },
  coverPlaceholder: {
    width: 96,
    height: 136,
    borderRadius: 16,
    backgroundColor: Colors.dark.backgroundSelected,
  },
  metaColumn: {
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: Spacing.three,
    borderRadius: 16,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  bodyText: {
    lineHeight: 24,
  },
  scoreGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  scoreCard: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: Colors.dark.backgroundElement,
    gap: Spacing.one,
  },
  scoreValue: {
    fontSize: 20,
    color: '#9ad66b',
  },
  detailGrid: {
    gap: Spacing.three,
  },
  detailBlock: {
    padding: Spacing.three,
    borderRadius: 18,
    backgroundColor: Colors.dark.backgroundElement,
    gap: Spacing.one,
  },
  screenshotList: {
    gap: Spacing.two,
  },
  screenshot: {
    width: 170,
    height: 96,
    borderRadius: 14,
    backgroundColor: Colors.dark.backgroundSelected,
  },
});
