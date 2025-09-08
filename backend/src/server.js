import express from 'express';
import dotenv from 'dotenv';
import helmet from "helmet";
import cors from 'cors';
import { limiter } from "./middlewares/rateLimit.js";
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';


dotenv.config();

console.log("Cargando variables de entorno...");
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("LOCAL_VIDEO_PATH:", process.env.LOCAL_VIDEO_PATH);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const app = express();

app.set('trust proxy', 1); // Para habilitar el uso de la IP real del cliente en entornos detrás de un proxy
// Middleware
app.use(limiter); // Apply rate limiting middleware
app.use(express.json());

// Se ha comentado la configuración de CORS en Express.
// La gestión de CORS se debe mover a la configuración de un proxy inverso
// como Nginx para evitar el error de "múltiples valores".
// const allowedOrigins = ['http://localhost:5173', 'http://hong.sytes.net'];
// app.use(cors({
//     origin: function (origin, callback) {
//         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//             callback(null, true);
//         } else {
//             callback(new Error('Not allowed by CORS'));
//         }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
// }));

//app.use(helmet());


// Connect to the database
connectDB();

// Import routes
app.use("/api/auth", authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/movies', movieRoutes);


// Middleware for global error handling
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
