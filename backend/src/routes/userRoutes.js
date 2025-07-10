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
} from '../controllers/userController.js'

const router = express.Router();

router.get('/', verifyToken, isAdmin, getAllUsers);
router.get('/:id', verifyToken, isAdmin, getUserById);
router.put('/:id', verifyToken, isAdmin, userValidation, validateFields, updateUser);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

export default router;
