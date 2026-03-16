export type Rol = 'usuario' | 'admin';

export interface DatosUsuario {
	dni: string;
	nombre: string;
	email: string;
	rol: Rol;
}

// Arquitectura Jerárquica: Sección → Votación → Participantes
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
	maxOpciones?: number;
	estado: 'abierta' | 'cerrada';
	fechaCreacion: Date;
	fechaCierre?: Date;
}

export interface Participante {
	id: string;
	votacionId: string;
	nombre: string;
	descripcion?: string;
	imagenUrl?: string;
	votos: number;
	sumaPuntuacion?: number;
	totalPuntuaciones?: number;
	promedioEstrellas?: number;
}

export interface Voto {
	id: string;
	usuarioId: string;
	votacionId: string;
	participantesIds: string[];
	puntuaciones?: Record<string, number>;
	timestamp: Date;
}
 