import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Layout del Panel de Administración
 *
 * Protege todas las rutas /admin/* verificando que el usuario tenga rol de administrador.
 * Si no es admin, redirige al dashboard. Incluye navegación por tabs para las secciones principales.
 */
export default function AdminLayout() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  // Protección de rutas: Solo admins pueden acceder
  useEffect(() => {
    if (!cargando && (!usuario || !usuario.esAdmin)) {
      router.replace('/dashboard' as any);
    }
  }, [usuario, cargando, router]);

  if (cargando || !usuario?.esAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#6C757D',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: '#F59E0B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Votaciones',
          tabBarIcon: () => null,
          headerTitle: '👑 Panel de Administración',
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: () => null,
          headerTitle: '👥 Gestión de Usuarios',
        }}
      />
      <Tabs.Screen
        name="resultados"
        options={{
          title: 'Resultados',
          tabBarIcon: () => null,
          headerTitle: '📊 Resultados',
        }}
      />
      {/* Ruta interna de gestión: oculta del tab bar */}
      <Tabs.Screen
        name="votaciones/[seccionId]"
        options={{
          href: null,
          headerTitle: 'Gestionar Votaciones',
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    height: 60,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  header: {
    backgroundColor: '#000',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
});
