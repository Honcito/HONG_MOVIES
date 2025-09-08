import express from 'express';
import { register, login, logout } from '../controllers/authController.js';
import { validateFields } from '../middlewares/validateFields.js';
import { body } from 'express-validator';
import { verifyToken } from '../middlewares/auth.js'; // Para verificar el JWT

const router = express.Router();

// Validation rules for registration
const authValidation = [
  body('username', 'Username is required').not().isEmpty(),
  body('email', 'Email is required').isEmail(),
  body('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
  // body('rol', 'Role is required').not().isEmpty().isIn(['admin', 'user']),
];

// Route for user registration
router.post('/register', authValidation, validateFields, register);

// Route for user login
router.post('/login', [
  body('email', 'Email is required').isEmail(),
  body('password', 'Password is required').not().isEmpty(),
], validateFields, login);

// Route for logout (optional if not using cookies)
router.post('/logout', logout);

// Get logged-in user info
router.get('/me', verifyToken, (req, res) => {
  console.log("Token decodificado:", req.user);
  // Aquí req.user ya viene del token decodificado
  res.json({ user: req.user });
});

export default router;
