import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpire: {
        type: Date()
    },
    rol: {
        type: String,
        enum: ['admin', 'user', 'superadmin'],
        required: true,
        default: 'user'
    }
},
{
    timestamps: true,
}
);

// Chyper the password before saving the user
userSchema.pre('save', async function (next) {
    if(!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

// Método para ejecutar en la función forgotPassword
userSchema.methods.getResetPasswordToken = function() {
    //Generar un token aleatorio
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hashear el token para guardarlo en la base de datos
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

        // Establecer la expiración 1 hora
        this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

        // Retornar el token sin hashear para enviarlo por correo
        return resetToken;
}

export default mongoose.model('User', userSchema);