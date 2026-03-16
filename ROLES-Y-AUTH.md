# 🔐 Sistema de Autenticación y Roles - Matsuri

## ✅ Funcionalidades implementadas

### 1️⃣ **No volver a pedir el DNI**
- ✅ El sistema verifica automáticamente si el usuario ya tiene DNI registrado
- ✅ Si ya tiene DNI, redirige directamente al dashboard
- ✅ Si NO tiene DNI, muestra el formulario de registro

**¿Cómo funciona?**
- En `AuthContext.tsx` se lee el documento del usuario desde Firestore
- Si existe, se marca como `dniRegistrado: true`
- En `app/index.tsx` (líneas 18-22) se redirige automáticamente al dashboard

### 2️⃣ **Sistema de Roles (Admin/Usuario)**
- ✅ Todos los usuarios se registran con un rol
- ✅ Admins se asignan automáticamente por correo electrónico
- ✅ El rol se muestra visualmente en el dashboard con un badge 👑

**¿Cómo funciona?**
- En `authService.ts` hay una lista `ADMIN_EMAILS`
- Si el email del usuario está en esa lista, se asigna rol `"admin"`
- Si no, se asigna rol `"usuario"`
- El rol se lee automáticamente en el `AuthContext` al iniciar sesión

---

## 🔧 Cómo añadir administradores

### Opción 1: **Por correo electrónico (Automático)** ⭐ Recomendado

1. Edita el archivo `services/authService.ts`
2. Añade el email en el array `ADMIN_EMAILS`:

```typescript
const ADMIN_EMAILS = [
  'admin@matsuri.com',
  'jose@tuemail.com',  // ⬅️ Añade tu email aquí
  'maria@example.com',
];
```

3. La próxima vez que ese usuario se registre, será admin automáticamente

---

### Opción 2: **Manualmente en Firestore Console**

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Abre tu proyecto
3. Ve a **Firestore Database**
4. Busca la colección `usuarios`
5. Encuentra el documento del usuario (su UID)
6. Edita el campo `rol`:
   - Cambia `"usuario"` → `"admin"`
7. Guarda los cambios
8. El usuario debe cerrar sesión y volver a entrar

---

### Opción 3: **Programáticamente (Para desarrolladores)**

Usa las funciones en `services/adminService.ts`:

```typescript
import { hacerAdmin, quitarAdmin } from '../services/adminService';

// Hacer admin a un usuario
await hacerAdmin("UID_DEL_USUARIO");

// Quitar permisos de admin
await quitarAdmin("UID_DEL_USUARIO");
```

---

## 🎯 Cómo usar los permisos en tu código

### Verificar si el usuario es admin

```typescript
import { useAuth } from '../contexts/AuthContext';

const MiComponente = () => {
  const { usuario } = useAuth();

  if (usuario?.esAdmin) {
    // Este usuario es admin
    return <PanelAdministracion />;
  }

  // Usuario normal
  return <PanelUsuario />;
};
```

### Acceder al rol completo

```typescript
const { usuario } = useAuth();

console.log(usuario?.datosUsuario?.rol); // "admin" o "usuario"
```

---

## 📋 Estructura de datos en Firestore

### Colección `usuarios/{uid}`
```json
{
  "uid": "ABC123...",
  "email": "usuario@ejemplo.com",
  "nombre": "Juan Pérez",
  "dni": "12345678A",
  "rol": "usuario",  // ⬅️ "usuario" | "admin"
  "fecha_registro": "2024-03-16T10:30:00Z"
}
```

### Colección `usuarios_dni/{dni}`
```json
{
  "uid_propietario": "ABC123...",
  "email_asociado": "usuario@ejemplo.com"
}
```

---

## ⚠️ Importante

1. **Los usuarios antiguos (registrados antes de estos cambios):**
   - Ya tienen rol asignado (`"usuario"` por defecto)
   - Para hacerlos admin, usa la Opción 2 o 3

2. **Seguridad:**
   - NUNCA expongas credenciales de admin en el código del cliente
   - Usa Firebase Security Rules para proteger operaciones sensibles
   - Valida permisos en el backend si realizas operaciones críticas

3. **DNI:**
   - El sistema NO vuelve a pedir el DNI si ya está registrado
   - Esto funciona automáticamente con `dniRegistrado: true`

---

## 🧪 Cómo probar

1. **Probar usuario normal:**
   - Inicia sesión con un email que NO esté en `ADMIN_EMAILS`
   - Verifica que el dashboard NO muestra el badge 👑

2. **Probar admin:**
   - Añade tu email a `ADMIN_EMAILS`
   - Cierra sesión y vuelve a iniciar sesión
   - Verifica que el dashboard muestra "👑 Admin"

3. **Probar DNI:**
   - Inicia sesión por primera vez → debe pedir DNI
   - Cierra la app y vuelve a abrirla → NO debe pedir DNI
   - Debe redirigir automáticamente al dashboard

---

## 📝 Próximos pasos sugeridos

- [ ] Añadir página de administración exclusiva para admins
- [ ] Implementar Firebase Security Rules basadas en roles
- [ ] Crear sistema de permisos más granular (moderador, editor, etc.)
- [ ] Añadir logs de auditoría para acciones de admin
