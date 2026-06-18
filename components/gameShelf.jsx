import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';

import GameCard from './gameCard';

export default function GameShelf({
  title,
  data,
  horizontal = false,
  emptyTitle = 'No hay resultados',
  emptyDescription = 'Prueba con otro filtro o actualiza los datos.',
}) {
  return (
    <View style={styles.sectionWrap}>
      <ThemedText type="subtitle">{title}</ThemedText>

      <FlatList
        data={data}
        horizontal={horizontal}
        scrollEnabled={horizontal}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => String(item?.id ?? item?.slug ?? index)}
        renderItem={({ item }) => <GameCard item={item} horizontal={horizontal} />}
        contentContainerStyle={horizontal ? styles.horizontalList : styles.verticalList}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {emptyTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {emptyDescription}
            </ThemedText>
          </ThemedView>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    gap: Spacing.two,
  },
  horizontalList: {
    gap: Spacing.three,
    paddingRight: Spacing.four,
  },
  verticalList: {
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