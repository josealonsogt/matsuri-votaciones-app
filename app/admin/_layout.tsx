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

export default function AdminLayout() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

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
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#6C757D',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitulo,
        headerTintColor: '#F59E0B',
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

const styles = StyleSheet.create({
  cargando: { flex: 1, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E9ECEF',
    height: 60, paddingTop: 8, paddingBottom: 8,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  header: { backgroundColor: '#000', borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
  headerTitulo: { fontSize: 19, fontWeight: 'bold', color: '#F59E0B' },
});