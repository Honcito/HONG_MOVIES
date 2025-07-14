// routes/movieRoutes.js
import express from "express";
import fs from 'fs';
import path from "path";
import {
  syncMoviesWithTMDB, /* otras funciones de tu controlador */
  getMovies,
  deleteMovie,
} from "../controllers/movieController.js";

// Importa tus middlewares de autenticación y autorización
import { verifyToken } from "../middlewares/auth.js"; // Para verificar el JWT
import { isAdmin } from "../middlewares/isAdmin.js"; // Para verificar el rol de administrador


const router = express.Router();

// Ruta para sincronizar películas
// Requiere que el usuario esté autenticado (verifyToken)
// Y que tenga el rol de administrador (isAdmin)
router.post("/sync-movies", verifyToken, isAdmin, syncMoviesWithTMDB);
// Ruta para obtener todas las películas de la base de datos, no requiere rol
router.get('/', verifyToken, getMovies);
// Ruta para eliminar película de la bd requiere role: admin
router.delete('/:id', verifyToken, isAdmin, deleteMovie)

router.get('/private_videos/:fileName', verifyToken, isAdmin, async (req, res) => {
  const fileName = req.params.fileName;

  if (fileName.includes('..')) {
    return res.status(400).json({ message: 'Nombre de archivo inválido.' });
  }

  const filePath = path.join(process.env.LOCAL_VIDEO_PATH, fileName);

  console.log('Buscando archivo:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    return res.status(404).send('Archivo no encontrado.');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return res.status(416).send('Requested range not satisfiable');
    }

    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });

    fs.createReadStream(filePath).pipe(res);
  }
});


export default router;
