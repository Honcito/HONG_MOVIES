import Movie from "../models/Movie.js";
import axios from "axios";
import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Asegúrate de que tus credenciales TMDB y rutas estén en tus variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;
const LOCAL_VIDEO_PATH = process.env.LOCAL_VIDEO_PATH;
const PUBLIC_VIDEO_BASE_URL = process.env.PUBLIC_VIDEO_BASE_URL;
const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL;

// --- Función Auxiliar para limpiar el nombre del archivo para la búsqueda en TMDB ---
function cleanFileNameForTMDB(fileName) {
  let nameWithoutExtension = path.parse(fileName).name;
  nameWithoutExtension = nameWithoutExtension.replace(/[\._-]/g, " ");
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\(\d{4}\)\s*/g, "");
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\[\d{4}\]\s*/g, "");
  nameWithoutExtension = nameWithoutExtension.replace(
    /\b(720p|1080p|2160p|4K|HDR|SDR|LATINO|ES|ENG|DUAL AUDIO|SUB|VOSE|DVDRip|BRRip|WEB-DL|BluRay|x264|x265|xvid|DTS|AC3|HDTV|AAC)\b/gi,
    ""
  );
  nameWithoutExtension = nameWithoutExtension.replace(
    /\b(mp4|mkv|avi|webm)\b/gi,
    ""
  );
  return nameWithoutExtension.trim();
}

// --- Función Auxiliar para buscar trailers en TMDB ---
async function getMovieTrailers(tmdbMovieId) {
  try {
    const response = await axios.get(
      `${TMDB_BASE_URL}/movie/${tmdbMovieId}/videos`,
      {
        params: {
          api_key: TMDB_API_KEY,
          language: "en-US",
        },
      }
    );
    const trailers = response.data.results.filter(
      (video) => video.site === "YouTube" && video.type === "Trailer" && video.key
    );
    if (trailers.length > 0) {
      return `http://googleusercontent.com/youtube.com/${trailers[0].key}`;
    }
    return null;
  } catch (error) {
    console.error(`Error al obtener trailers para TMDB ID ${tmdbMovieId}:`, error.message);
    return null;
  }
}

// --- Nueva Función Auxiliar para buscar y procesar una película en TMDB ---
async function processMovieFile(fileName) {
  const cleanedTitle = cleanFileNameForTMDB(fileName);
  const publicFilePath = `${PUBLIC_VIDEO_BASE_URL}/${fileName}`;

  try {
    // 1. Buscar en TMDB
    const searchResponse = await axios.get(
      `${TMDB_BASE_URL}/search/movie`,
      {
        params: {
          api_key: TMDB_API_KEY,
          query: cleanedTitle,
          language: "es-ES",
        },
      }
    );

    const tmdbMovie = searchResponse.data.results[0];

    if (!tmdbMovie) {
      console.warn(`No TMDB match found for: "${cleanedTitle}".`);
      // Devuelve todos los campos, pero con valores null/vacíos
      return {
        title: cleanedTitle,
        file_path: publicFilePath,
        visible: true,
        tmdb_id: null,
        original_title: null,
        overview: null,
        release_date: null,
        runtime: null,
        director: null,
        genres: [],
        poster_path: null,
        original_language: null,
        vote_average: null,
        vote_count: null,
        trailer_url: null,
      };
    }

    // 2. Obtener detalles extendidos
    const detailsResponse = await axios.get(
      `${TMDB_BASE_URL}/movie/${tmdbMovie.id}`,
      {
        params: {
          api_key: TMDB_API_KEY,
          append_to_response: "credits",
          language: "es-ES",
        },
      }
    );

    const fullTmdbMovie = detailsResponse.data;
    const directorInfo = fullTmdbMovie.credits.crew.find(
      (person) => person.job === "Director"
    );
    const trailerUrl = await getMovieTrailers(fullTmdbMovie.id);

    return {
      tmdb_id: fullTmdbMovie.id,
      title: fullTmdbMovie.title,
      original_title: fullTmdbMovie.original_title,
      overview: fullTmdbMovie.overview,
      release_date: fullTmdbMovie.release_date ? new Date(fullTmdbMovie.release_date) : null,
      runtime: fullTmdbMovie.runtime,
      director: directorInfo ? directorInfo.name : "Desconocido",
      genres: fullTmdbMovie.genres.map((g) => g.name),
      poster_path: fullTmdbMovie.poster_path ? `${TMDB_IMAGE_BASE_URL}${fullTmdbMovie.poster_path}` : null,
      original_language: fullTmdbMovie.original_language,
      vote_average: fullTmdbMovie.vote_average,
      vote_count: fullTmdbMovie.vote_count,
      trailer_url: trailerUrl,
      file_path: publicFilePath,
      visible: true,
    };
  } catch (tmdbError) {
    console.error(`Error processing ${fileName} with TMDB:`, tmdbError.message);
    // Devuelve todos los campos, pero con valores null/vacíos en caso de error de la API
    return {
      title: cleanedTitle,
      file_path: publicFilePath,
      visible: true,
      tmdb_id: null,
      original_title: null,
      overview: null,
      release_date: null,
      runtime: null,
      director: null,
      genres: [],
      poster_path: null,
      original_language: null,
      vote_average: null,
      vote_count: null,
      trailer_url: null,
    };
  }
}

// --- Función Principal de Sincronización (Optimización) ---
export const syncMoviesWithTMDB = async (req, res) => {
  try {
    console.log("Iniciando sincronización...");

    // 1. Obtener todas las películas de la base de datos y los archivos locales.
    const [dbMovies, files] = await Promise.all([
      Movie.find({}).lean(),
      fsPromises.readdir(LOCAL_VIDEO_PATH)
    ]);

    const dbMovieFileNames = new Set(dbMovies.map(m => path.basename(m.file_path)));
    const movieFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return [".mp4", ".mkv", ".avi", ".webm"].includes(ext);
    });
    
    // 2. Identificar películas nuevas (archivos que no están en la base de datos).
    const newMoviesToProcess = movieFiles.filter(file => !dbMovieFileNames.has(file));
    
    // 3. Procesar películas nuevas de forma concurrente con Promise.all
    console.log(`Se han encontrado ${newMoviesToProcess.length} películas nuevas para procesar.`);
    const newMoviesData = await Promise.all(newMoviesToProcess.map(processMovieFile));
    
    // 4. Insertar las películas nuevas en la base de datos de forma masiva
    let newOrUpdatedCount = 0;
    if (newMoviesData.length > 0) {
      await Movie.insertMany(newMoviesData);
      newOrUpdatedCount += newMoviesData.length;
      console.log(`Se han añadido ${newMoviesData.length} películas nuevas.`);
    }

    // 5. Marcar como invisibles las películas que ya no están en la carpeta.
    const allDbFileNames = movieFiles.map(file => path.basename(file));
    const moviesToMarkInvisible = dbMovies.filter(dbMovie => 
      dbMovie.visible && dbMovie.file_path && !allDbFileNames.includes(path.basename(dbMovie.file_path))
    );

    if (moviesToMarkInvisible.length > 0) {
      await Movie.updateMany(
        { _id: { $in: moviesToMarkInvisible.map(m => m._id) } },
        { $set: { visible: false } }
      );
      console.log(`Se han marcado ${moviesToMarkInvisible.length} películas como invisibles.`);
    }

    console.log("Sincronización completa.");
    res.status(200).json({ 
        message: "Movie synchronization complete!",
        newOrUpdatedCount: newOrUpdatedCount,
        invisibleCount: moviesToMarkInvisible.length,
        // *** CAMBIO AQUÍ: devolvemos los datos de las películas nuevas ***
        newMovies: newMoviesData 
    });

  } catch (error) {
    console.error("Error durante la sincronización de películas:", error);
    res.status(500).json({ message: "Failed to synchronize movies", error: error.message });
  }
};


// ... resto de tu código (getMovies, deleteMovie, streamPrivateVideo)
export const getMovies = async (req, res) => {
  try {
    const userRole = req.user?.rol;
    console.log("Usuario autenticado:", req.user);
    const movies = await Movie.find({}).lean();
    const moviesToSend = movies.map(movie => {
      const movieData = { ...movie };
      if (userRole !== 'admin') {
        delete movieData.file_path;
      }
      return movieData;
    });
    res.status(200).json(moviesToSend);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ message: "Failed to fetch movies", error: error.message });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMovie = await Movie.findByIdAndDelete(id);
    if (!deletedMovie) {
      return res.status(404).json({ message: "Película no encontrada." });
    }
    res.status(200).json({ message: "Película eliminada con éxito.", deletedMovie });
  } catch (error) {
    console.error("Error al eliminar la película:", error);
    res.status(500).json({ message: "Error interno del servidor al eliminar la película.", error: error.message });
  }
};


export const streamPrivateVideo = async (req, res) => {
    try {
        // Asegúrate de que el usuario esté autenticado.
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Unauthorized access" });
        }

        const movieId = req.params.id;
        const movie = await Movie.findById(movieId);
        if (!movie || !movie.file_path) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        // Reconstruye la ruta completa al archivo de video
        const videoPath = path.join(LOCAL_VIDEO_PATH, path.basename(movie.file_path));

        // Verifica si el archivo existe
        const stat = await fsPromises.stat(videoPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunkSize = (end - start) + 1;
            const fileStream = fs.createReadStream(videoPath, { start, end });

            // Envía las cabeceras de respuesta para streaming
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
            });

            fileStream.pipe(res);
        } else {
            // Si no hay cabecera 'Range', envía el archivo completo (no ideal para streaming)
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });

            fs.createReadStream(videoPath).pipe(res);
        }

    } catch (error) {
        console.error("Error in video streaming:", error);
        res.status(500).json({ message: "Error while streaming video", error: error.message });
    }
};

// Crear una nueva película manualmente
export const createMovie = async (req, res) => {
  try {
    const body = { ...req.body };

    // Normalizar booleanos
    if (body.visible === "on") body.visible = true;
    if (body.visible === "off") body.visible = false;

    // Normalizar arrays (si viene como string separado por comas)
    if (body.genres && typeof body.genres === "string") {
      body.genres = body.genres.split(",").map(g => g.trim());
    }

    // Normalizar fechas
    if (body.release_date) {
      const date = new Date(body.release_date);
      if (!isNaN(date)) body.release_date = date;
      else body.release_date = null;
    }

    const movie = new Movie(body);
    await movie.save();
    res.status(201).json(movie);
  } catch (error) {
    console.error("Error al crear película:", error);
    res.status(500).json({ message: "Error al crear película", error: error.message });
  }
};


// Actualizar una película existente
export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    // Normalizar booleanos
    if (body.visible === "on") body.visible = true;
    if (body.visible === "off") body.visible = false;

    // Normalizar arrays
    if (body.genres && typeof body.genres === "string") {
      body.genres = body.genres.split(",").map(g => g.trim());
    }

    // Normalizar fechas
    if (body.release_date) {
      const date = new Date(body.release_date);
      if (!isNaN(date)) body.release_date = date;
      else body.release_date = null;
    }

    const updatedMovie = await Movie.findByIdAndUpdate(id, body, { new: true, runValidators: true });

    if (!updatedMovie) {
      return res.status(404).json({ message: "Película no encontrada." });
    }

    res.status(200).json(updatedMovie);
  } catch (error) {
    console.error("Error al actualizar la película:", error);
    res.status(500).json({ message: "Error interno al actualizar", error: error.message });
  }
};

