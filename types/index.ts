// ============================================================================
// 📚 DICCIONARIO DE TIPOS — types.ts
//
// Define la "forma" exacta de todos los datos que circulan por la app.
// Si intentas guardar algo que no encaje aquí, TypeScript te avisará en
// tiempo de compilación, antes de que el error llegue al usuario.
//
// ARQUITECTURA DE DATOS:
//   Sección (categoría) → Votación → Participantes (opciones a votar)
// ============================================================================

// ─── Usuarios y Roles ───────────────────────────────────────────────────────

export type Rol = 'usuario' | 'admin';

export interface DatosUsuario {
  dni: string;
  nombre: string;
  email: string;
  rol: Rol;
}

// Estadísticas de participación del usuario (para su perfil)
export interface EstadisticasUsuario {
  totalVotos: number;
  categorias: string[];  // Nombres de las secciones donde ha votado
}

// ─── Estructura principal ────────────────────────────────────────────────────

// Los tres métodos de votación soportados
export type MetodoVotacion = 'unica' | 'multiple' | 'puntuacion';

export interface Seccion {
  id: string;
  nombre: string;
  icono?: string;
  descripcion?: string;
  orden: number;
  activa: boolean;
  fechaCreacion: Date;
}

export interface Votacion {
  id: string;
  seccionId: string;
  titulo: string;
  descripcion?: string;
  metodoVotacion: MetodoVotacion;
  maxOpciones?: number;     // Solo relevante cuando metodoVotacion === 'multiple'
  estado: 'abierta' | 'cerrada';
  visible?: boolean;        // false = solo el admin la ve; true = pública
  fechaCreacion: Date;
  fechaCierre?: Date;
}

// Participante = cada opción votable dentro de una Votación
export interface Participante {
  id: string;
  votacionId: string;
  nombre: string;
  descripcion?: string;
  // Campos de conteo — cuál se usa depende del método de votación:
  votos: number;              // Método 'unica' / 'multiple'
  sumaPuntuacion?: number;    // Método 'puntuacion': suma acumulada de notas
  totalPuntuaciones?: number; // Método 'puntuacion': cuántas personas han puntuado
  promedioEstrellas?: number; // Método 'puntuacion': sumaPuntuacion / totalPuntuaciones
}

// Registro inmutable del voto emitido por un usuario
export interface Voto {
  id: string;
  usuarioId: string;
  votacionId: string;
  participantesIds: string[];
  puntuaciones?: Record<string, number>; // { "id_participante": 8 }
  timestamp: Date;
}