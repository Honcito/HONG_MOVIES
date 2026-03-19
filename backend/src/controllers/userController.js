import User from "../models/User.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

console.log("Credenciales de email:", process.env.EMAIL_USER, process.env.EMAIL_PASS)

// 

export async function getAllUsers(req, res) {
  try {
    // 1. PROYECCIÓN: Excluye el campo 'password' para seguridad y eficiencia.
    // 2. LÍMITE: Restringe la respuesta a un máximo de 50 documentos.
    const users = await User.find()
      .select('-password') // ¡Añadido! No devolver el password
      .limit(50) // ¡Añadido! Limita la respuesta para evitar la saturación
      .lean(); // ¡Añadido! Convierte documentos Mongoose a objetos JS planos para velocidad.

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function createUser(req, res) {
  try {
    const { username, email, rol, password } = req.body;

    if (!username || !email || !rol || !password) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const user = new User({ username, email, rol, password });
    await user.save();

    res.status(201).json(user);
  } catch (error) {
    console.error("Error in createUser", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("Error in getUserById", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateUser(req, res) {
  try {
    const { username, email, rol, password } = req.body;
    
    // Check if the request body is empty.
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "req body params is empty" });
    }

    const updateFields = {};

    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (rol) updateFields.rol = rol;

    // Only update the password if it's provided in the request body.
    if (password) {
      // Hash the new password before updating
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields, // Pass the updateFields object
      { new: true, runValidators: true } // runValidators ensures schema validation is applied on update
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove password from the response for security
    const userWithoutPassword = updatedUser.toObject();
    delete userWithoutPassword.password;

    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Error in updateUser", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteUser(req, res) {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User delete successfully" });
  } catch (error) {
    console.error("Error in deleteUser", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function forgotPassword(req, res) {
  let user;
  try {
    const { email } = req.body;
    user = await User.findOne({ email });
    const FRONTEND_URL = process.env.FRONTEND_URL;

    if (!user) {
      return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    }

    // Genera el token plano
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hashea el token plano para guardarlo de forma segura
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // Expira en 1 hora

    await user.save({ validateBeforeSave: false });

    // Crea la URL con el token plano
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Recuperación de contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${resetUrl}`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
    if (user) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar la solicitud.' });
  }
};

export async function resetPassword(req, res) {
  try {
    const { token } = req.query;
    const { newPassword } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
    }

    user.password = newPassword;

    await user.save(); 

    res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Error en resetPassword', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
}
