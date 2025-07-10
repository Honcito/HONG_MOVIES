// models/Movie.js
import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
    tmdb_id: {
        type: Number,
        required: false, // ¡Permite que sea null!
        // No necesitas 'unique: true' ni 'sparse: true' aquí
        // si permites múltiples 'null' y el 'file_path' es la clave única principal.
        // Si QUISIERAS que tmdb_id fuera único para las *películas que sí lo tienen*,
        // entonces SÍ necesitarías `unique: true, sparse: true`.
        // Para simplificar y permitir cualquier número de 'null' sin errores, es mejor quitar 'unique: true' del tmdb_id.
    },
    title: String,
    original_title: String,
    overview: String,
    release_date: Date,
    runtime: Number,
    director: String,
    genres: [String],
    poster_path: String,
    original_language: String,
    vote_average: Number,
    vote_count: Number,
    trailer_url: String,
    file_path: { // <--- ¡ESTE ES EL CAMBIO CLAVE Y CORRECTO!
        type: String,
        required: true, // Cada película DEBE tener una ruta de archivo.
        unique: true    // ¡Esta es LA ÚNICA clave que asegura no duplicar documentos de archivos locales!
    },
    visible: {
        type: Boolean,
        default: true,
    },
},
{
    timestamps: true
});

export default mongoose.model('Movie', movieSchema);