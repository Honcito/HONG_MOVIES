import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
    tmdb_id: {
        type: Number,
        required: true,
        unique: true
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
    file_path: String // Ruta SMB para acceder a la película
},
{
    timestamps: true
}
);

export default mongoose.model('Movie', movieSchema);