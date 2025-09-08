import jwt from 'jsonwebtoken'; // Asegúrate de que importas jwt

export function verifyToken(req, res, next) {
    let token = null;
    const authHeader = req.headers["authorization"];

    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided in Authorization header or query",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log("Token verificado correctamente:", decoded);
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
}