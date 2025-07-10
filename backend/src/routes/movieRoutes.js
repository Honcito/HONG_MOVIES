// routes/movieRoutes.js
import express from "express";
import {
  syncMoviesWithTMDB, /* otras funciones de tu controlador */
  getMovies,
  deleteMovie,
} from "../controllers/movieController.js";

// Importa tus middlewares de autenticación y autorización
import { verifyToken } from "../middlewares/auth.js"; // Para verificar el JWT
import { isAdmin } from "../middlewares/isAdmin.js"; // Para verificar el rol de administrador
// import { userValidation } from '../validation/userValidation.js'; // No necesario para esta ruta
// import { validateFields } from '../middlewares/validateFields.js'; // No necesario para esta ruta a menos que 'syncMoviesWithTMDB' reciba datos en el body

const router = express.Router();

// Ruta para sincronizar películas
// Requiere que el usuario esté autenticado (verifyToken)
// Y que tenga el rol de administrador (isAdmin)
router.post("/sync-movies", verifyToken, isAdmin, syncMoviesWithTMDB);
// Ruta para obtener todas las películas de la base de datos, no requiere rol
router.get('/', verifyToken, getMovies);
// Ruta para eliminar película de la bd requiere role: admin
router.delete('/:id', verifyToken, isAdmin, deleteMovie)

// Aquí irían otras rutas de películas que necesiten diferentes niveles de protección:
// router.get('/movies', verifyToken, getMovies); // Para obtener películas (todos los usuarios autenticados)
// router.get('/movies/:id', verifyToken, getMovieById); // Para obtener una película específica

export default router;
