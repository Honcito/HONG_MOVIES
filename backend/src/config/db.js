import mongoose from 'mongoose';
import dotenv from 'dotenv';


const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            // PARAMETRO CLAVE AÑADIDO:
            maxPoolSize: 100, // Establece el límite del pool de conexiones a 100
            // Opcional: minPoolSize: 10, // Mantiene 10 conexiones abiertas como mínimo
            
            // OTRAS OPCIONES COMUNES (puedes dejarlas si ya existían o añadirlas):
            serverSelectionTimeoutMS: 5000, // Timeout para el descubrimiento del servidor
            // Más opciones pueden ir aquí si las necesitas...
        });
        console.log("✅ MongoDB connected successfully (Pool Size: 100)");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1); // Exit the process with failure
    }
};

export default connectDB;