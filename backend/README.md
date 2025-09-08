# 🎬 HONG_MOVIES – Backend de Películas

Backend desarrollado con **Node.js, Express y MongoDB (Mongoose)** que permite gestionar un catálogo de películas y usuarios, con autenticación mediante **JWT** y control de accesos por roles.  

El sistema se integra con **The Movie Database (TMDB)** para enriquecer los metadatos de las películas de manera automática.  
Las películas se sirven en **streaming** desde un servidor **NGINX en Ubuntu**, desplegado en un PC particular y mantenido activo con **PM2**.  
Además, el acceso remoto se realiza mediante **No-IP**, que redirige la IP dinámica a un dominio estable.

---

## 🚀 Características principales

- Gestión de **usuarios** con roles (`user`, `admin`, `superadmin`).
- Autenticación con **JSON Web Tokens (JWT)**.
- Gestión de **películas** con campos enriquecidos desde **TMDB** (título, director, géneros, duración, póster, etc.).
- Campo `file_path` único para servir cada película desde **NGINX**.
- **Sincronización automática** entre archivos locales y base de datos.
- Middleware de seguridad:
  - **Helmet** para cabeceras seguras.
  - **CORS** configurado.
  - **Rate limit** para proteger de abuso de peticiones.
- Validaciones con **express-validator**.
- Logs HTTP con **morgan**.
- Contraseñas cifradas con **bcryptjs**.
- Configuración de variables de entorno con **dotenv**.
- Arquitectura modular con controladores, modelos, rutas y middlewares.

---

## 📂 Estructura del proyecto

```bash
├── backend
│   └── src
│       ├── config
│       │   └── db.js
│       ├── controllers
│       │   ├── authController.js
│       │   ├── movieController.js
│       │   └── userController.js
│       ├── middlewares
│       │   ├── auth.js
│       │   ├── errorHandler.js
│       │   ├── isAdmin.js
│       │   ├── rateLimit.js
│       │   └── validateFields.js
│       ├── models
│       │   ├── Movie.js
│       │   └── User.js
│       ├── routes
│       │   ├── authRoutes.js
│       │   ├── movieRoutes.js
│       │   └── userRoutes.js
│       ├── server.js
│       └── utils
│           └── generateJWT.js
🖼️ Arquitectura del sistema
A continuación se muestra un diagrama que representa la arquitectura general del proyecto:


🗄️ Modelos principales

🎥 Movie
{
  "tmdb_id": Number,
  "title": String,
  "original_title": String,
  "overview": String,
  "release_date": Date,
  "runtime": Number,
  "director": String,
  "genres": [String],
  "poster_path": String,
  "original_language": String,
  "vote_average": Number,
  "vote_count": Number,
  "trailer_url": String,
  "file_path": { "type": String, "required": true, "unique": true },
  "visible": { "type": Boolean, "default": true }
}
👤 User

{
  "username": String,
  "email": { "type": String, "unique": true },
  "password": String, // cifrada con bcryptjs
  "rol": { "type": String, "enum": ["admin", "user", "superadmin"], "default": "user" }
}

⚙️ Configuración de entorno
El sistema requiere un archivo .env en la carpeta backend/ con las siguientes variables:

PORT=3000
MONGO_URI=mongodb://localhost:27017/peliculas (o tu connection string de Mongodb añadiendo el nombre de la base de datos que desees)
JWT_SECRET=tu_clave_secreta

# Credenciales y endpoints de The Movie Database (TMDB)
TMDB_API_KEY=tu_api_key_de_tmdb
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/

# Ruta local donde se almacenan las películas
LOCAL_VIDEO_PATH=/ruta/a/tu/carpeta/peliculas
PUBLIC_VIDEO_BASE_URL=http://tuservidor.com/peliculas

👉 Importante: el backend consume datos de The Movie Database para completar automáticamente cada película.

🔄 Sincronización de películas con TMDB
Una funcionalidad clave del backend es la sincronización automática:

Escanea la carpeta definida en LOCAL_VIDEO_PATH para detectar archivos de vídeo nuevos (.mp4, .mkv, .avi, .webm).

Limpia el nombre de archivo (Titulo (2023) 1080p.mkv → Titulo).

Consulta la API de TMDB para obtener metadatos de la película (título original, sinopsis, géneros, director, fecha, carátula, puntuación, tráiler).

Inserta la película en MongoDB, vinculándola al file_path correspondiente.

Si una película ya no está en la carpeta, se marca automáticamente como visible: false en la base de datos.

De este modo, el backend mantiene sincronizados los archivos locales con los datos oficiales de TMDB.

📌 Endpoints

⚠️ Nota: Todos los endpoints protegidos requieren Bearer Token en la cabecera Authorization.
Ejemplo:
Authorization: Bearer <tu_token_jwt>

### 🔹 Autenticación

| Método | Endpoint           | Descripción                           | Autorización |
| POST   | /api/auth/register | Registro de usuario                   | ❌ No |
| POST   | /api/auth/login    | Inicio de sesión (user o admin)       | ❌ No |
| POST   | /api/auth/logout   | Cerrar sesión                         | 🔑 Sí |
| GET    | /api/auth/me       | Obtener datos del usuario autenticado | 🔑 Sí |

### 🔹 Usuarios

| Método | Endpoint         | Descripción               | Autorización |
| GET    | /api/users       | Listar todos los usuarios | 🔑 Sí (admin/superadmin) |
| GET    | /api/users/:id   | Obtener usuario por ID    | 🔑 Sí (admin/superadmin) |
| PUT    | /api/users/:id   | Actualizar usuario        | 🔑 Sí (admin/superadmin) |
| DELETE | /api/users/:id   | Eliminar usuario          | 🔑 Sí (admin/superadmin) |

### 🔹 Películas

| Método | Endpoint                | Descripción                                               | Autorización |
| POST   | /api/movies/sync-movies | Sincronizar películas del servidor Ubuntu y TMDB          | 🔑 Sí (superadmin) |
| GET    | /api/movies             | Listar todas las películas (datos TMDB + servidor)        | 🔑 Sí (admin/superadmin) |
| GET    | /api/movies/public      | Listar películas públicas (hero) | ❌ No |
| GET    | /api/movies/stream/:id  | Streaming privado de una película                         | 🔑 Sí (admin/superadmin) |
| GET    | /api/movies/search?query=<título o género> | Buscar películas por título o género   | 🔑 Sí (admin/superadmin) |
| PUT    | /api/movies/:id         | Actualizar película manualmente en DB                     | 🔑 Sí (superadmin) |
| DELETE | /api/movies/:id         | Eliminar película de la base de datos                     | 🔑 Sí (superadmin) |



📦 Dependencias principales

express

mongoose

jsonwebtoken

bcryptjs

cors

helmet

express-rate-limit

express-validator

morgan

dotenv

axios

smb2 (para acceso a comparticiones de red)

🌐 Despliegue en servidor Ubuntu
Para un entorno de producción se recomienda:

NGINX: sirve los archivos de vídeo de forma estática desde la ruta configurada en LOCAL_VIDEO_PATH.

PM2: gestiona el backend en segundo plano, asegurando que el proceso se reinicie automáticamente si se cae.

No-IP: redirige la IP dinámica de tu PC a un dominio estable, permitiendo el acceso externo al backend y los vídeos.

Flujo de trabajo
El usuario accede a tu dominio configurado con No-IP.

El backend (Express + MongoDB) responde a las peticiones de datos y autenticación.

Los vídeos se reproducen desde la carpeta local expuesta por NGINX.

📜 Licencia
Este proyecto se distribuye bajo licencia MIT.