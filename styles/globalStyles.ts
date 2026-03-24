// styles/globalStyles.ts
import { StyleSheet } from 'react-native';

// 💡 Definimos los colores aquí mismo para que no explote la app al arrancar.
// NO importes 'theme' en este archivo.
const COLORS = {
  primary: '#E03131',
  surface: '#FFFFFF',
  background: '#F4F6F8',
  textDark: '#1C1E21',
  textMuted: '#868E96',
  border: '#E9ECEF',
  danger: '#C92A2A',
};

// Se exporta con "const" para que en los demás archivos no dé error el { globalStyles }
export const globalStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  
  // Tipografía
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },
  
  // Tarjetas flotantes
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  
  // Botones
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  btnPrimaryText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  
  btnSecondary: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: { color: COLORS.textDark, fontSize: 15, fontWeight: '600' },
  
  // Badges (Píldoras)
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.textDark,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Flex Layouts
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  // Botón Danger
  btnDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  btnDangerText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  // Estados vacíos (Empty State)
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textDark, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },

  // Formularios
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textDark,
    marginBottom: 16,
  },
});