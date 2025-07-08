import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateJWT(user) {
    const SECRET_KEY = process.env.JWT_SECRET
    return jwt.sign(
        {
            id: user._id,
            username: user.username,
            email: user.email,
            rol: user.rol,
        },
        SECRET_KEY,
        {
            expiresIn: '1d'
        }
    );
}