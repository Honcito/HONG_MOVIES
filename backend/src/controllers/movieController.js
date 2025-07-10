// src/controllers/movieController.js
import Movie from "../models/Movie.js"; // Tu modelo Movie
import axios from "axios";
import fs from "fs/promises"; // Para operaciones asíncronas con archivos
import path from "path";

// Asegúrate de que tus credenciales TMDB y rutas estén en tus variables de entorno
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;
const LOCAL_VIDEO_PATH = process.env.LOCAL_VIDEO_PATH;
const PUBLIC_VIDEO_BASE_URL = process.env.PUBLIC_VIDEO_BASE_URL;
const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL; // Asegúrate de tener esta variable en tu .env

// --- Función Auxiliar para limpiar el nombre del archivo para la búsqueda en TMDB ---
function cleanFileNameForTMDB(fileName) {
  // 1. Elimina la extensión del archivo de forma segura al inicio.
  let nameWithoutExtension = path.parse(fileName).name;

  // 2. Reemplaza puntos, guiones bajos o guiones por espacios.
  nameWithoutExtension = nameWithoutExtension.replace(/[\._-]/g, " ");

  // 3. Remueve años entre paréntesis (ej. "(2020)") o brackets (ej. "[2020]").
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\(\d{4}\)\s*/g, "");
  nameWithoutExtension = nameWithoutExtension.replace(/\s*\[\d{4}\]\s*/g, "");

  // 4. Elimina tags de calidad/idioma/etc. comunes, usando límites de palabra `\b`.
  //    Esto es crucial para evitar eliminar subcadenas.
  nameWithoutExtension = nameWithoutExtension.replace(
    /\b(720p|1080p|2160p|4K|HDR|SDR|LATINO|ES|ENG|DUAL AUDIO|SUB|VOSE|DVDRip|BRRip|WEB-DL|BluRay|x264|x265|xvid|DTS|AC3|HDTV|AAC)\b/gi,
    ""
  );

  // 5. Opcional: Elimina cualquier extensión de archivo que pueda haber quedado en el medio
  //    o al final si no fue capturada por path.parse, pero usando límites de palabra.
  //    Hemos movido MP4|MKV|AVI|WEBM a esta sección.
  nameWithoutExtension = nameWithoutExtension.replace(
    /\b(mp4|mkv|avi|webm)\b/gi,
    ""
  );


  // 6. Recorta espacios extra y devuelve
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
          language: "en-US", // Puedes ajustar el idioma si TMDB lo soporta
        },
      }
    );

    const trailers = response.data.results.filter(
      (video) => video.site === "YouTube" && video.type === "Trailer"
    );

    if (trailers.length > 0) {
      // ¡CORRECCIÓN AQUÍ! Quita el '0' extra
      return `http://googleusercontent.com/youtube.com/${trailers[0].key}`;
    }
    return null; // No se encontraron trailers
  } catch (error) {
    console.error(
      `Error fetching trailers for TMDB ID ${tmdbMovieId}:`,
      error.message
    );
    return null;
  }
}

// --- Función Principal de Sincronización ---
export const syncMoviesWithTMDB = async (req, res) => {
  try {
    // 1. Leer archivos de la carpeta de videos local
    const files = await fs.readdir(LOCAL_VIDEO_PATH);
    const movieFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".mp4", ".mkv", ".avi", ".webm"].includes(ext); // Ajusta las extensiones que uses
    });

    const newOrUpdatedMovies = [];

    for (const fileName of movieFiles) {
      const cleanedTitle = cleanFileNameForTMDB(fileName);
      const publicFilePath = `${PUBLIC_VIDEO_BASE_URL}/${fileName}`; // Calcula la ruta pública del archivo
      console.log(`Processing: ${fileName} -> Cleaned: "${cleanedTitle}"`); // Añadí comillas para ver mejor el título limpio

      // Primero, busca si ya existe una película con este file_path
      // Esto es crucial para manejar casos donde no hay TMDB match
      let existingMovie = await Movie.findOne({ file_path: publicFilePath });

      let movieData = {
        file_path: publicFilePath,
        visible: true,
      };

      try {
        // 2. Buscar en TMDB
        const searchResponse = await axios.get(
          `${TMDB_BASE_URL}/search/movie`,
          {
            params: {
              api_key: TMDB_API_KEY,
              query: cleanedTitle,
              language: "es-ES", // O el idioma de tu preferencia para los datos
            },
          }
        );

        const tmdbMovie = searchResponse.data.results[0]; // Tomamos el primer resultado

        if (tmdbMovie) {
          console.log(`Found "${tmdbMovie.title}" on TMDB.`);

          // 3. Obtener detalles extendidos (para el runtime, director si los necesitas de forma más específica)
          const detailsResponse = await axios.get(
            `${TMDB_BASE_URL}/movie/${tmdbMovie.id}`,
            {
              params: {
                api_key: TMDB_API_KEY,
                append_to_response: "credits,videos", // Pide también créditos (para director) y videos (para trailers)
                language: "es-ES",
              },
            }
          );

          const fullTmdbMovie = detailsResponse.data;
          const directorInfo = fullTmdbMovie.credits.crew.find(
            (person) => person.job === "Director"
          );
          const trailerUrl = await getMovieTrailers(fullTmdbMovie.id);

          // Actualizar movieData con la información de TMDB
          movieData = {
            ...movieData, // Mantiene file_path y visible
            tmdb_id: fullTmdbMovie.id,
            title: fullTmdbMovie.title,
            original_title: fullTmdbMovie.original_title,
            overview: fullTmdbMovie.overview,
            release_date: fullTmdbMovie.release_date
              ? new Date(fullTmdbMovie.release_date)
              : null,
            runtime: fullTmdbMovie.runtime,
            director: directorInfo ? directorInfo.name : "Desconocido",
            genres: fullTmdbMovie.genres.map((g) => g.name),
            poster_path: fullTmdbMovie.poster_path
              ? `${TMDB_IMAGE_BASE_URL}${fullTmdbMovie.poster_path}`
              : null,
            original_language: fullTmdbMovie.original_language,
            vote_average: fullTmdbMovie.vote_average,
            vote_count: fullTmdbMovie.vote_count,
            trailer_url: trailerUrl,
          };

          // Si ya existe una película con este file_path (encontrada al principio del bucle)
          if (existingMovie) {
            await Movie.updateOne(
              { _id: existingMovie._id },
              { $set: movieData }
            );
            console.log(`Updated movie (TMDB match): ${movieData.title}`);
          } else {
            // Si no existe por file_path, creamos una nueva
            const newMovie = new Movie(movieData);
            await newMovie.save();
            newOrUpdatedMovies.push(newMovie);
            console.log(`Added new movie: ${movieData.title}`);
          }
        } else {
          console.warn(`No TMDB match found for: "${cleanedTitle}"`);
          // Si no hay match en TMDB, solo guardamos el file_path y el título limpio,
          // asegurando que tmdb_id y otros campos TMDB sean null/vacíos.
          movieData.title = cleanedTitle; // Usar el título limpio si no hay TMDB match
          // Asegurarse de que no guardamos un tmdb_id si no hay match
          movieData.tmdb_id = null; // Establecer en null
          movieData.overview = null;
          movieData.release_date = null;
          movieData.runtime = null;
          movieData.director = null;
          movieData.genres = [];
          movieData.poster_path = null;
          movieData.original_language = null;
          movieData.vote_average = null;
          movieData.vote_count = null;
          movieData.trailer_url = null;

          if (existingMovie) {
            await Movie.updateOne(
              { _id: existingMovie._id },
              { $set: movieData }
            );
            console.log(`Updated movie (no TMDB match): ${movieData.title || fileName}`);
          } else {
            const newMovie = new Movie(movieData);
            await newMovie.save();
            newOrUpdatedMovies.push(newMovie);
            console.log(`Added movie (no TMDB match): ${movieData.title || fileName}`);
          }
        }
      } catch (tmdbError) {
        console.error(
          `Error processing ${fileName} with TMDB:`,
          tmdbError.message
        );
        // Si la búsqueda/detalles de TMDB falla, manejamos como "no TMDB match"
        // Asegúrate de limpiar los datos de TMDB si hubo un error.
        movieData.title = cleanedTitle;
        movieData.tmdb_id = null; // Establecer en null si la API falló
        movieData.overview = null;
        movieData.release_date = null;
        movieData.runtime = null;
        movieData.director = null;
        movieData.genres = [];
        movieData.poster_path = null;
        movieData.original_language = null;
        movieData.vote_average = null;
        movieData.vote_count = null;
        movieData.trailer_url = null;

        if (existingMovie) {
          await Movie.updateOne(
            { _id: existingMovie._id },
            { $set: movieData }
          );
          console.log(`Updated movie (TMDB API error): ${movieData.title || fileName}`);
        } else {
          const newMovie = new Movie(movieData);
          await newMovie.save();
          newOrUpdatedMovies.push(newMovie);
          console.log(`Added movie (TMDB API error): ${movieData.title || fileName}`);
        }
      }
    }

    // 6. Marcar películas que ya no están en la carpeta como no visibles
    // Esto es útil si borraste un archivo físico y quieres que se refleje.
    const allDbMovies = await Movie.find({});
    for (const dbMovie of allDbMovies) {
      if (!dbMovie.file_path) {
        console.warn(
          `Movie "${
            dbMovie.title || dbMovie.tmdb_id
          }" in DB has no file_path. Skipping visibility check.`
        );
        continue;
      }

      const dbFileName = path.basename(dbMovie.file_path);
      // Extrae solo los nombres de archivo de movieFiles para la comparación
      const currentMovieFileNames = movieFiles.map(file => path.basename(file));

      if (!currentMovieFileNames.includes(dbFileName)) {
        if (dbMovie.visible) {
          await Movie.updateOne({ _id: dbMovie._id }, { $set: { visible: false } });
          console.log(`Marked as invisible (file not found): ${dbMovie.title}`);
        }
      }
    }

    res
      .status(200)
      .json({ message: "Movie synchronization complete!", newOrUpdatedMovies });
  } catch (error) {
    console.error("Error during movie synchronization:", error);
    res
      .status(500)
      .json({ message: "Failed to synchronize movies", error: error.message });
  }
};

// En tu movieController.js (o donde manejes la ruta GET /api/movies)

// Asume que tienes una ruta como esta:
// router.get('/movies', authMiddleware, getMovies); // Donde authMiddleware popula req.user

export const getMovies = async (req, res) => {
  try {
    const userRole = req.user && req.user.role; // Asume que req.user.role contiene 'admin' o 'user'

    // Obtén todas las películas visibles por defecto (o según cualquier otro filtro general)
    // No filtramos por `visible` aquí si todos deben ver al menos el tráiler.
    // Si tienes películas que deben estar ocultas de _todos_ los usuarios (incluidos los admins),
    // entonces sí podrías mantener un `query = { visible: true };` aquí.
    const movies = await Movie.find({}).lean(); // Usa .lean() para modificar los objetos más fácilmente

    // Itera sobre las películas y ajusta los campos según el rol del usuario
    const moviesToSend = movies.map(movie => {
      // Crea una copia del objeto película para no modificar el original de Mongoose
      const movieData = { ...movie };

      // Si el usuario NO es un admin, elimina la URL del video y asegúrate de que solo tenga la URL del tráiler.
      if (userRole !== 'admin') {
        delete movieData.file_path; // Elimina el campo file_path para usuarios normales
        // Opcional: Podrías incluso establecerlo a null o un string vacío si lo prefieres,
        // pero eliminarlo es más claro: movieData.file_path = null;
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
        const { id } = req.params; // Obtiene el ID de la película de los parámetros de la URL

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