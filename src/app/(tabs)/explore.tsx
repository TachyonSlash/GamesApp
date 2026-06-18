import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GameShelf from '../../../components/gameShelf';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getComingSoonGames, getMostAnticipatedGames } from '../../../services/games';

export default function ComingSoonScreen() {
  const [anticipatedGames, setAnticipatedGames] = useState<any[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadComingSoon() {
      try {
        setLoading(true);
        setError('');

        const [anticipated, upcoming] = await Promise.all([
          getMostAnticipatedGames(10),
          getComingSoonGames(20),
        ]);

        if (!isActive) {
          return;
        }

        setAnticipatedGames(Array.isArray(anticipated) ? anticipated : []);
        setUpcomingGames(Array.isArray(upcoming) ? upcoming : []);
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar Coming Soon.');
          setAnticipatedGames([]);
          setUpcomingGames([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadComingSoon();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title">Coming Soon</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Juegos esperados y próximos lanzamientos.
            </ThemedText>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" />
              <ThemedText themeColor="textSecondary">Cargando próximos lanzamientos...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <ThemedText type="subtitle">No se pudo cargar Coming Soon</ThemedText>
              <ThemedText themeColor="textSecondary">{error}</ThemedText>
            </View>
          ) : (
            <>
              <GameShelf
                title="Más anticipados"
                data={anticipatedGames}
                horizontal
                emptyTitle="Sin juegos anticipados"
                emptyDescription="Prueba más tarde para ver los títulos más esperados."
              />

              <GameShelf
                title="Próximos lanzamientos"
                data={upcomingGames}
                horizontal
                emptyTitle="Sin próximos lanzamientos"
                emptyDescription="No hay lanzamientos futuros disponibles por ahora."
              />
            </>
          )}
        </ScrollView>
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
  },
  content: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  subtitle: {
    maxWidth: 320,
  },
  loadingBox: {
    padding: Spacing.four,
    borderRadius: 20,
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    padding: Spacing.four,
    borderRadius: 20,
    gap: Spacing.one,
  },
});