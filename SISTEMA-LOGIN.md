# 🔐 Sistema de Login Dual - Matsuri

## 📋 Dos formas de acceder

### 1️⃣ **Login con Google** (Recomendado)
- Click en "Inicia sesión con Google"
- Seleccionas tu cuenta de Google
- Introduces tu DNI una única vez
- ✅ Futuras sesiones: Automático sin pedir DNI

### 2️⃣ **Login Manual (Email + DNI como contraseña)**
- Introduces tu email personal
- Introduces tu DNI (que hace de contraseña oculta)
- El sistema automáticamente:
  - Si ya te registraste antes → te hace login
  - Si es tu primera vez → te registra

---

## 🔒 ¿Cómo funciona la contraseña oculta?

El sistema combina tu DNI con una clave secreta del proyecto:
```
Contraseña = "Matsuri" + TU_DNI + "*2026"
Ejemplo: Si tu DNI es 12345678Z → Password: Matsuri12345678Z*2026
```

**Ventajas:**
- ✅ No tienes que recordar contraseñas
- ✅ Tu DNI actúa como verificador de identidad
- ✅ Un voto = Una persona (evita duplicados)

---

## 🚫 Validaciones implementadas

### Email Manual:
| Caso | Mensaje |
|------|---------|
| Email sin formato válido | ❌ Email inválido |
| DNI sin formato 8 dígitos + letra | ❌ Formato incorrecto |
| Letra del DNI no coincide | ⚠️ DNI No Válido |
| DNI ya vinculado a otra cuenta | 🚫 DNI ya registrado |
| Email ya usado con otro DNI | 🚫 Email ya en uso |
| Sin conexión a internet | 📡 Error de conexión |

### Google:
| Caso | Mensaje |
|------|---------|
| DNI sin formato correcto | ❌ Formato incorrecto |
| Letra del DNI incorrecta | ⚠️ DNI No Válido |
| DNI ya vinculado a otra cuenta | 🚫 DNI ya registrado |
| Error de base de datos | ❌ Error al guardar |

---

## 🎯 Flujo completo del sistema

### **Primera vez (Registro):**
```
Usuario → Elige método (Google o Email)
       ↓
Google: Login Google → Introduce DNI → Guardado en BD ✅
Email:  Introduce Email + DNI → Cuenta creada ✅
       ↓
Redirige al Dashboard
```

### **Siguientes veces (Login):**
```
Usuario → Elige método
       ↓
Google: Automático (ya tiene DNI) → Dashboard ✅
Email:  Introduce Email + DNI → Login automático ✅
       ↓
Sistema lee DNI de Firestore → No vuelve a preguntar
```

---

## 🗄️ Estructura en Firestore

### Colección `usuarios/{uid}`
```json
{
  "uid": "ABC123",
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "dni": "12345678Z",
  "rol": "usuario",
  "fecha_registro": "2024-03-16T10:00:00Z"
}
```

### Colección `usuarios_dni/{dni}`
```json
{
  "uid_propietario": "ABC123",
  "email_asociado": "usuario@example.com"
}
```

**¿Por qué dos colecciones?**
- `usuarios/{uid}` → Información completa del usuario
- `usuarios_dni/{dni}` → Evita duplicados (un DNI solo puede vincularse a un UID)

---

## 🔧 Códigos de error de Firebase Auth

Estos son los códigos que el sistema maneja:

| Código | Significado | Solución |
|--------|-------------|----------|
| `auth/user-not-found` | Usuario no existe | Se crea automáticamente |
| `auth/invalid-credential` | Credenciales incorrectas | Se crea nueva cuenta |
| `auth/wrong-password` | Contraseña incorrecta | Email ya usado con otro DNI |
| `auth/email-already-in-use` | Email ya registrado | Usar otro email |
| `auth/weak-password` | Contraseña débil | Error de config (no debería pasar) |
| `auth/network-request-failed` | Sin conexión | Revisar internet |

---

## ⚠️ Casos especiales

### ¿Qué pasa si...?

**1. Dos personas intentan registrarse con el mismo DNI:**
- ✅ El segundo intento es bloqueado
- ✅ Mensaje: "🚫 DNI ya registrado"

**2. Una persona intenta usar dos emails con el mismo DNI:**
- ✅ Bloqueado en el segundo intento
- ✅ Mensaje: "🚫 DNI ya registrado en otra cuenta"

**3. Una persona olvida con qué email se registró:**
- ⚠️ Problema: No puede recuperar su cuenta fácilmente
- 🔧 Solución futura: Implementar recuperación de cuenta

**4. Alguien intenta hacer login con Email pero se registró con Google:**
- ❌ No funcionará (diferentes métodos de autenticación)
- 🔧 Solución: Usar el mismo método con el que se registró

---

## 🚀 Mejoras futuras recomendadas

1. **Recuperación de cuenta:**
   - Función "¿Olvidaste tu cuenta?" para buscar por DNI
   - Mostrar un hint del email asociado (ej: "j***@gmail.com")

2. **Unificar métodos:**
   - Vincular Google y Email para la misma persona
   - Permitir cambiar de método de login

3. **Verificación adicional:**
   - Enviar email de verificación
   - Código de confirmación por SMS

4. **Panel de usuario:**
   - Ver datos registrados
   - Cambiar email (manteniendo el DNI)
   - Desvincular cuenta

---

## 🧪 Cómo probar

### Caso 1: Registro nuevo con Email
1. Click en "Entrar con Email Manual"
2. Introduce: `test@example.com` + `12345678Z`
3. ✅ Debe crear la cuenta y redirigir al dashboard

### Caso 2: Login con Email existente
1. Usa el mismo email y DNI del Caso 1
2. ✅ Debe hacer login automáticamente

### Caso 3: DNI duplicado
1. Crea una cuenta: `user1@test.com` + `12345678Z`
2. Intenta crear otra: `user2@test.com` + `12345678Z`
3. ✅ Debe mostrar "🚫 DNI ya registrado"

### Caso 4: Email duplicado con DNI diferente
1. Crea una cuenta: `test@example.com` + `12345678Z`
2. Intenta: `test@example.com` + `87654321X`
3. ✅ Debe detectar conflicto y mostrar error

### Caso 5: Login con Google + DNI
1. Click en "Inicia sesión con Google"
2. Selecciona cuenta
3. Introduce DNI válido
4. ✅ Debe guardar y no volver a pedirlo

---

## 📝 Notas técnicas

- La contraseña se genera del lado del cliente (no es ideal para producción)
- En producción real, considera:
  - Firebase Cloud Functions para validaciones del lado del servidor
  - Hash del DNI para mayor privacidad
  - Tokens de autenticación de corta duración
  - Rate limiting para evitar ataques de fuerza bruta
