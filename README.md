# Votaciones Matsuri - App de Votaciones

Aplicación de votaciones desarrollada con **React Native (Expo)**, **TypeScript** y **Firebase**. 

Este documento contiene la información necesaria para configurar, levantar y continuar el desarrollo del proyecto.

## 🛠 Tecnologías Principales

- **Framework:** React Native + Expo (con Expo Router / app directory).
- **Lenguaje:** TypeScript (`types/index.ts` contiene la estructura central de datos).
- **Backend/Base de Datos:** Firebase (Authentication y Firestore).
- **Estilos:** NativeWind / Tailwind CSS (vía `global.css`).
- **Despliegue Web:** Vercel (configurado en `vercel.json`).

## ⚙️ Requisitos Previos

Asegúrate de tener instalado en tu máquina:
- [Node.js](https://nodejs.org/) (recomendado v18 o superior).
  

##  Instalación y Configuración Local

1. **Clonar el repositorio y entrar a la carpeta:**
   ```bash
   git clone https://github.com/josealonsogt/matsuri-votaciones-app.git
   cd votaciones-matsuri
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```
   *(Si la empresa usa yarn, ejecuta `yarn install` en su lugar).*

3. **Variables de Entorno (IMPORTANTE):**
   No subimos credenciales al repositorio por seguridad. Debes solicitar o buscar las variables de Firebase.  
   Crea un archivo `.env` en la raíz del proyecto basándote en un `.env.example` y añade las claves para inicializar Firebase:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY="tu_api_key"
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="tu_project_id.firebaseapp.com"
   EXPO_PUBLIC_FIREBASE_PROJECT_ID="tu_project_id"
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET="tu_project_id.appspot.com"
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="tu_sender_id"
   EXPO_PUBLIC_FIREBASE_APP_ID="tu_app_id"
   ```

4. **Levantar el entorno de desarrollo:**
   ```bash
   npx expo start
   ```
   Esto abrirá un panel en tu terminal. Puedes presionar `i` para abrir el simulador de iOS, `a` para Android o escanear el código QR con la app **Expo Go** en tu dispositivo físico.

## 📂 Arquitectura del Proyecto

El proyecto sigue una estructura organizada por dominios basada en Expo Router:
- `/app` - Vistas y rutas de la app (Home, Dashboard, Admin, etc.).
- `/components` - Componentes de la interfaz de usuario reutilizables.
- `/contexts` - Estado global (ej. `AuthContext.tsx` para sesión de usuarios).
- `/hooks` - Custom hooks (ej. autenticación con Google).
- `/services` - Lógica de conexión externa (Base de datos de Firebase: `votacionesService`, `authService`).
- `/types/index.ts` - **Diccionario maestro de tipos.** *💡 Por favor asómate aquí primero, define toda la forma de los datos (Secciones, Votaciones, Participantes y Votos).*

## Accesos e Infraestructura

Para poder modificar y desplegar la app en su totalidad, necesitarás pedir que te den acceso a las siguientes plataformas con tu correo de la empresa:

1. **Firebase Console:** Para gestionar la base de datos de Firestore, reglas de seguridad y usuarios (Authentication).
2. **Vercel / Hosting:** Para ver o modificar métricas y ramas del despliegue en web.
3. **Cuenta de Expo (EAS) / Tiendas (Si aplica):** Cuentas necesarias para publicar futuras actualizaciones en App Store / Play Store.

##  Notas de traspaso
- El sistema de navegación soporta distintos tipos de votación (`unica`, `multiple`, `puntuacion`, `texto_libre`).
- Lee la lógica dentro de `/services/votacionesService.ts` si necesitas alterar el cómo se cuentan o manipulan los votos.
---
Desarrollado con ❤️ y preparado para el futuro.
