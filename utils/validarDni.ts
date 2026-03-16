export const validarDni = (dni: string): boolean => {
  // 1. Quitamos espacios y lo ponemos en mayúsculas por si el usuario escribe raro
  const dniLimpio = dni.trim().toUpperCase();

  // 2. Comprobamos que el formato sea exactamente 8 números y 1 letra
  const formatoValido = /^[0-9]{8}[A-Z]$/.test(dniLimpio);
  if (!formatoValido) {
    return false; // Si no tiene 8 números y 1 letra, fuera.
  }

  // 3. Separamos los números de la letra
  const numero = parseInt(dniLimpio.slice(0, 8), 10);
  const letraProporcionada = dniLimpio.charAt(8);

  // 4. El algoritmo oficial de España: Dividir el número entre 23
  // El resto de esa división corresponde a una letra exacta de esta cadena:
  const letrasValidas = "TRWAGMYFPDXBNJZSQVHLCKE";
  const letraCalculada = letrasValidas.charAt(numero % 23);

  // 5. Comparamos la letra que ha puesto el usuario con la que dice la matemática
  return letraProporcionada === letraCalculada;
};