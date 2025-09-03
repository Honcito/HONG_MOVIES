// routes/movieRoutes.js
import express from "express";
import Movie from "../models/Movie.js";
import {
  syncMoviesWithTMDB,
  getMovies,
  deleteMovie,
  createMovie,
  updateMovie,
  streamPrivateVideo
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

// Ruta para obtener una sola película por ID.
// (Ahora que '/public' está antes, esta ruta no se confundirá)
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Película no encontrada' });
    }
    res.json(movie);
  } catch (err) {
    console.error("Error en GET /api/movies/:id", err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para obtener todas las películas.
// No requiere autenticación, por lo que cualquiera puede ver la lista.
router.get('/', getMovies);

// ----------------------------------------------------
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN Y ROLES)
// ----------------------------------------------------

// Ruta para sincronizar películas con TMDB (admin o superadmin)
router.post("/sync-movies", verifyToken, isAdmin, syncMoviesWithTMDB);

// Ruta para eliminar película de la base de datos (solo superadmin)
router.delete('/:id', verifyToken, isSuperAdmin, deleteMovie);

// Ruta para reproducir videos privados (requiere estar logueado)
router.get("/private_videos/:id", verifyToken, streamPrivateVideo);

// Crear nueva película
router.post("/", verifyToken, isSuperAdmin, createMovie);

// Actualizar película existente
router.put("/:id", verifyToken, isSuperAdmin, updateMovie);



export default router;