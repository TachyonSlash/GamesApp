import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';

const ACTIONS = [
  { key: 'refresh', label: 'Actualizar vista' },
  { key: 'top100', label: 'Top 100' },
  { key: 'comingSoon', label: 'Coming Soon' },
  { key: 'recentlyReleased', label: 'Recently Released' },
  { key: 'random', label: 'Juego random' },
  { key: 'genre', label: 'Género' },
  { key: 'platform', label: 'Plataforma' },
  { key: 'company', label: 'Compañía' },
  { key: 'developer', label: 'Desarrolladora' },
];

export default function FilterMenu({ visible, onClose, onSelectAction }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menuCard} onPress={() => {}}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Filtrar
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Elige una vista o un catálogo.
            </ThemedText>
          </View>

          <View style={styles.actions}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                onPress={() => onSelectAction(action.key)}
              >
                <ThemedText type="smallBold">{action.label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {'>'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <ThemedText type="smallBold">Cerrar</ThemedText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  menuCard: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.four,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  header: {
    gap: Spacing.one,
  },
  title: {
    marginBottom: 0,
  },
  actions: {
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pressed: {
    opacity: 0.8,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: Colors.dark.backgroundElement,
  },
});