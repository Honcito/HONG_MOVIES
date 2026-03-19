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
- **Middleware de seguridad:**
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
├── .env.example
└── ecosystem.config.example.json

🖼️ Arquitectura del sistema

A continuación se muestra un diagrama que representa la arquitectura general del proyecto y el flujo de conexión entre el cliente, el servidor Ubuntu y la base de datos:

🗄️ Modelos principales

🎥 MovieJSON{
  "tmdb_id": "Number",
  "title": "String",
  "original_title": "String",
  "overview": "String",
  "release_date": "Date",
  "runtime": "Number",
  "director": "String",
  "genres": ["String"],
  "poster_path": "String",
  "original_language": "String",
  "vote_average": "Number",
  "vote_count": "Number",
  "trailer_url": "String",
  "file_path": { "type": "String", "required": true, "unique": true },
  "visible": { "type": "Boolean", "default": true }
}

👤 UserJSON{
  "username": "String",
  "email": { "type": "String", "unique": true },
  "password": "String", // cifrada con bcryptjs
  "rol": { "type": "String", "enum": ["admin", "user", "superadmin"], "default": "user" }
}
⚙️ Configuración de entorno

El sistema requiere un archivo .env en la raíz del proyecto. 
Se incluye un archivo .env.example con la estructura necesaria. 
Para configurar el proyecto:
  Copia el archivo de ejemplo: cp .env.example .envEdita el .env con tus credenciales reales:
  Fragmento de código
  
PORT=3000
MONGO_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/movies_app
JWT_SECRET=tu_clave_secreta

# Credenciales y endpoints de TMDB
TMDB_API_KEY=tu_api_key_de_tmdb
TMDB_BASE_URL=[https://api.themoviedb.org/3](https://api.themoviedb.org/3)
TMDB_IMAGE_BASE_URL=[https://image.tmdb.org/t/p/](https://image.tmdb.org/t/p/)

# Ruta local de almacenamiento
LOCAL_VIDEO_PATH=/ruta/a/tu/carpeta/peliculas
PUBLIC_VIDEO_BASE_URL=[http://tuservidor.com/peliculas](http://tuservidor.com/peliculas)


👉 Importante: el backend consume datos de The Movie Database para completar automáticamente cada película.

🔄 Sincronización de películas con TMDB

Una funcionalidad clave del backend es la sincronización automática:
Escanea la carpeta definida en LOCAL_VIDEO_PATH (.mp4, .mkv, .avi, .webm).Limpia el nombre de archivo (ej: Titulo (2023) 1080p.mkv → Titulo).
Consulta la API de TMDB para obtener metadatos (título original, sinopsis, géneros, director, póster, tráiler).
Inserta en MongoDB vinculándola al file_path.Soft 
Delete: Si una película ya no está en la carpeta, se marca automáticamente como visible: false.

📌 Endpoints
⚠️ Nota: Todos los endpoints protegidos requieren Bearer Token en la cabecera Authorization.
### 🔹 Autenticación

| Método   | Endpoint             | Descripción                           | Autorización|
| **POST** | `/api/auth/register` | Registro de usuario                   | ❌ No       |
| **POST** | `/api/auth/login`    | Inicio de sesión (user o admin)       | ❌ No       |
| **POST** | `/api/auth/logout`   | Cerrar sesión                         | 🔑 Sí       |
| **GET**  | `/api/auth/me`       | Obtener datos del usuario autenticado | 🔑 Sí       |

### 🔹 Usuarios

| Método     | Endpoint         | Descripción               |         Autorización     |
| **GET**    | `/api/users`     | Listar todos los usuarios | 🔑 Sí (admin/superadmin) |
| **GET**    | `/api/users/:id` | Obtener usuario por ID    | 🔑 Sí (admin/superadmin) |
| **PUT**    | `/api/users/:id` | Actualizar usuario        | 🔑 Sí (admin/superadmin) |
| **DELETE** | `/api/users/:id` | Eliminar usuario          | 🔑 Sí (admin/superadmin) |

### 🔹 Películas

| Método     | Endpoint                       | Descripción                                      | Autorización |
| **POST**   | `/api/movies/sync-movies`      | Sincronizar películas del servidor Ubuntu y TMDB | 🔑 Sí (superadmin) |
| **GET**    | `/api/movies`                  | Listar todas las películas (datos TMDB + servidor) | 🔑 Sí (admin/superadmin) |
| **GET**    | `/api/movies/public`           | Listar películas públicas (hero) | ❌ No |
| **GET**    | `/api/movies/stream/:id`       | Streaming privado de una película | 🔑 Sí (admin/superadmin) |
| **GET**    | `/api/movies/search?query=...` | Buscar películas por título o género | 🔑 Sí (admin/superadmin) |
| **PUT**    | `/api/movies/:id`              | Actualizar película manualmente en DB | 🔑 Sí (superadmin) |
| **DELETE** | `/api/movies/:id`              | Eliminar película de la base de datos | 🔑 Sí (superadmin) |

📦 Dependencias principales
express, mongoose, jsonwebtoken, bcryptjs, cors, helmet, express-rate-limit, express-validator, morgan, dotenv, axios, smb2.

🌐 Despliegue en servidor Ubuntu
Para un entorno de producción se utiliza:NGINX: sirve los archivos de vídeo de forma estática desde LOCAL_VIDEO_PATH.PM2: gestiona el backend en segundo plano con reinicio automático.
No-IP: redirige la IP dinámica a un dominio estable para acceso externo.
Gestión con PM2
El proyecto incluye una configuración de clúster para aprovechar todos los núcleos de la CPU. 
Para arrancar:Bashpm2 start ecosystem.config.json
(Asegúrate de configurar las rutas cwd en el archivo real antes de lanzar).

🔒 Nota sobre SeguridadEste repositorio no contiene credenciales reales. Los archivos ecosystem.config.json y .env están ignorados por Git siguiendo las buenas prácticas de seguridad. 
Utilice los archivos .example proporcionados para configurar su propio entorno.

📜 LicenciaEste proyecto se distribuye bajo licencia MIT.