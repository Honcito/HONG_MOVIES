

export function isAdmin(req, res, next) {
    if(req.user && req.user.rol === 'admin' || req.user.rol ==='superadmin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false,
            message: 'Access denied. Only admin at least'
        })
    }
}