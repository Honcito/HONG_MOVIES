// userController.js
const nodemailer = require('nodemailer');
const User = require('../models/User'); // Asegúrate de importar tu modelo de usuario

// Crea el transporter una sola vez, cuando el archivo se carga
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// La función se exporta para su uso en las rutas
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // 1. Busca el usuario en la base de datos
    const user = await User.findOne({ email });

    if (!user) {
      // Si el usuario no existe, envía una respuesta genérica por seguridad.
      return res.status(200).json({ message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
    }

    // 2. Genera el token de recuperación (suponiendo que este método está en tu modelo de usuario)
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // 3. Crea el URL de reseteo (asegúrate de que esta URL apunte a tu frontend)
    const resetUrl = `https://tu-dominio.com/reset-password?token=${resetToken}`;

    // 4. Configura y envía el correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Recuperación de Contraseña',
      text: `Para restablecer tu contraseña, haz clic en el siguiente enlace: ${resetUrl}`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Correo de recuperación enviado con éxito.' });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar la solicitud.' });
  }
};