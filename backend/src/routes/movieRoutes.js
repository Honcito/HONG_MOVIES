// routes/movieRoutes.js
import express from "express";
import Movie from "../models/Movie.js";
import {
  syncMoviesWithTMDB,
  getMovies,
  deleteMovie,
  createMovie,
  updateMovie,
  streamPrivateVideo,
  searchMovies
} from "../controllers/movieController.js";

// Importa tus middlewares de autenticación y autorización
import { verifyToken } from "../middlewares/auth.js"; // Para verificar el JWT
import { isAdmin } from "../middlewares/isAdmin.js"; // Para verificar el rol de administrador
import { isSuperAdmin } from "../middlewares/isSuperAdmin.js"; // Importa el nuevo middleware

const router = express.Router();

// ----------------------------------------------------
// RUTAS PÚBLICAS (ACCESIBLES POR TODOS)
// ----------------------------------------------------

// Ruta para obtener películas públicas.
// **Esta ruta más específica debe ir antes de /:id.**
router.get('/public', async (req, res) => {
  try {
    const movies = await Movie.find({ visible: true }).select("tmdb_id title original_title poster_path");
    res.json(movies);
  } catch (err) {
    console.error("Error en /api/movies/public:", err);
    res.status(500).json({ error: "Error al obtener las películas" });
  }
});

// Ruta para obtener todas las películas.
// Se añade verifyToken para que el controlador pueda identificar el ROL del usuario.
router.get('/', getMovies);

// Ruta para realizar búsquedas por título o género.
// Se añade verifyToken para identificar al usuario durante la búsqueda.
router.get("/search", searchMovies);

// ----------------------------------------------------
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN Y ROLES)
// ----------------------------------------------------

// Ruta para sincronizar películas con TMDB (admin o superadmin)
router.post("/sync-movies", verifyToken, isAdmin, syncMoviesWithTMDB);

// Ruta para eliminar película de la base de datos (solo superadmin)
router.delete('/:id', verifyToken, isSuperAdmin, deleteMovie);

// Ruta para reproducir videos privados (requiere estar logueado)
router.get("/private_videos/:id", verifyToken, streamPrivateVideo);

// Crear nueva película (solo superadmin)
router.post("/", verifyToken, isSuperAdmin, createMovie);

// Actualizar película existente (solo superadmin)
router.put("/:id", verifyToken, isSuperAdmin, updateMovie);

// Ruta para obtener una sola película por ID.
// Se añade verifyToken para permitir que Admins vean campos protegidos en el detalle.
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Película no encontrada' });
    }

    const movieData = movie.toObject();
    const userRole = req.user?.rol;

    // Lógica de privacidad: Si no es admin ni superadmin, eliminamos el path del archivo
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      delete movieData.file_path;
    }

    res.json(movieData);
  } catch (err) {
    console.error("Error en GET /api/movies/:id", err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;