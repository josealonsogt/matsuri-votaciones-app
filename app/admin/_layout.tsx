// ============================================================================
// 🔒 LAYOUT DEL PANEL ADMIN — app/admin/_layout.tsx
//
// Protege todas las rutas /admin/* verificando que el usuario tenga rol admin.
// Si no lo es, lo redirige al dashboard silenciosamente.
// ============================================================================

import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../styles/theme';

export default function AdminLayout() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  // 💡 SOLUCIÓN: Movemos los estilos AQUÍ ADENTRO.
  // Así nos aseguramos de que "theme" ya está 100% cargado en memoria.
  const styles = StyleSheet.create({
    cargando: { flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
    tabBar: {
      backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border,
      height: 60, paddingTop: 8, paddingBottom: 8,
    },
    tabLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    header: { backgroundColor: theme.colors.textDark, borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
    headerTitulo: { fontSize: 19, fontWeight: 'bold', color: theme.colors.secondary },
  });

  // Expulsar usuarios que no sean admin
  useEffect(() => {
    if (!cargando && (!usuario || !usuario.esAdmin)) {
      router.replace('/dashboard' as any);
    }
  }, [usuario, cargando, router]);

  if (cargando || !usuario?.esAdmin) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitulo,
        headerTintColor: theme.colors.secondary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Votaciones', tabBarIcon: () => null, headerTitle: '👑 Panel Admin' }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{ title: 'Usuarios', tabBarIcon: () => null, headerTitle: '👥 Usuarios' }}
      />
      <Tabs.Screen
        name="resultados"
        options={{ title: 'Resultados', tabBarIcon: () => null, headerTitle: '📊 Resultados' }}
      />
    </Tabs>
  );
}