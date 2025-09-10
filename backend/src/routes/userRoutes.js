import express from 'express';
import { userValidation } from '../validation/userValidation.js';
import { verifyToken } from '../middlewares/auth.js';
import { validateFields } from '../middlewares/validateFields.js';
import { isAdmin } from '../middlewares/isAdmin.js';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser,
    forgotPassword,
    resetPassword
} from '../controllers/userController.js'
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, getAllUsers);
router.post('/', verifyToken, isAdmin, createUser);
router.get('/:id', verifyToken, isAdmin, getUserById);
router.put('/:id', verifyToken, isSuperAdmin, userValidation, validateFields, updateUser);
router.delete('/:id', verifyToken, isSuperAdmin, deleteUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password', resetPassword);

export default router;
