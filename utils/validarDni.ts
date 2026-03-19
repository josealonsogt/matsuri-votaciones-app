// ============================================================================
// 🔢 VALIDADOR DE DNI ESPAÑOL — utils/validarDni.ts
//
// Comprueba que la letra de control es correcta para los 8 dígitos dados.
// Algoritmo oficial: módulo 23 sobre los dígitos, indexado en LETRAS_DNI.
// ============================================================================

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/**
 * Valida un DNI español comprobando que la letra de control es correcta.
 * Asume que el formato (8 dígitos + 1 letra mayúscula) ya fue validado antes.
 *
 * @param dni DNI en formato "12345678Z" (limpio, sin espacios)
 * @returns true si la letra es correcta; false si no
 */
export const validarDni = (dni: string): boolean => {
  const numero = parseInt(dni.slice(0, 8), 10);
  const letra = dni.charAt(8).toUpperCase();
  return LETRAS_DNI[numero % 23] === letra;
};