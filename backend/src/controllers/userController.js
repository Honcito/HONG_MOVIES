import User from "../models/User.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  aut: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function getAllUsers(req, res) {
  try {
    const users = await User.find();
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
  try{
    const { email } = req.body;
  // Buscar el usuario en la base de datos
  const user = await User.findOne({ email });
  const FRONTEND_URL = process.env.FRONTEND_URL;

  if (!user) {
    // Si el usuario no existe se envía una respuesta 200 ok por seguridad, Al enviar siempre una respuesta 200 y el mismo mensaje genérico, un atacante no puede distinguir si el correo existe o no
    return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
  }

  // Crear la URL de reseteo (Asegurarse de que la URL apunte al frontend)
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Configurar y enviar correo
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Recuperación de contraseña',
    text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${resetUrl}`
  };

  await transporter.sendMail(mailOptions);

  res.status(200).json({ message: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar la solicitud.' });
  }
};

export async function resetPassword(req, res) {
try {
  const { token } = req.query; // En este caso el token viene como parámetro de consulta de la URL
  const { newPassword } = req.body;

  // Hashear el token recibido para buscarlo en la base de datos
  const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

  // Buscar al usuario por el token hasheado y verificar la expiración
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }, // El símbolo $gt = greater than ()
  })
} catch (error) {
  
}
}