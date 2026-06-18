import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

function getImageUrl(item) {
  if (!item?.cover?.url) return null;
  return `https:${item.cover.url.replace('t_thumb', 't_1080p')}`;
}

function getYear(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).getFullYear();
}

export default function GameCard({ item, horizontal = false }) {
  const imageUrl = getImageUrl(item);
  const title = item?.name ?? 'Juego sin nombre';
  const score = item?.total_rating ? item.total_rating.toFixed(1) : 'N/A';
  const genre = item?.genres?.[0]?.name ?? 'Sin género';
  const year = getYear(item?.release_date ?? item?.first_release_date);
  const gameId = item?.id != null ? String(item.id) : '';

  return (
    <Pressable
      onPress={() => {
        if (!gameId) {
          return;
        }

        router.push({ pathname: '/game/[id]', params: { id: gameId } });
      }}
    >
      <ThemedView style={[styles.card, horizontal && styles.horizontalCard]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit={horizontal ? 'cover' : 'contain'}
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.info}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">{genre}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{year || '---'}</ThemedText>
            <ThemedText type="smallBold">{score}</ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  horizontalCard: {
    width: 220,
  },
  image: {
    width: '100%',
    height: 280,
  },
  placeholder: {
    width: '100%',
    height: 280,
  },
  info: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});