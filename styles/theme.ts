// styles/theme.ts
export const theme = {
  colors: {
    primary: '#E03131',      // Rojo Carmesí (Acciones principales, ganadores)
    primaryLight: '#FFF5F5', // Fondo suave rojizo
    secondary: '#F59E0B',    // Dorado (Medallas, detalles)
    background: '#F4F6F8',   // Gris muy claro para el fondo global
    surface: '#FFFFFF',      // Blanco puro para las tarjetas
    textDark: '#1C1E21',     // Texto principal
    textMuted: '#868E96',    // Textos secundarios
    border: '#E9ECEF',       // Bordes muy sutiles
    success: '#2B8A3E',
    danger: '#C92A2A',
  },
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
    }
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    pill: 999,
  }
};