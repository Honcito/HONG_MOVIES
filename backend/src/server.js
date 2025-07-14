import express from 'express';
import dotenv from 'dotenv';
import helmet from "helmet";
import cors from 'cors';
import { limiter } from "./middlewares/rateLimit.js";
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import movieRoutes from './routes/movieRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';


dotenv.config();

const app = express();

// Middleware
app.use(limiter); // Apply rate limiting middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(helmet());
app.use(cookieParser());

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