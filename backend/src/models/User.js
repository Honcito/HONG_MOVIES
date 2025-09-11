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
        type: Date
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

// Método para generar el token de recuperación de forma segura y consistente.
userSchema.methods.getResetPasswordToken = function() {
    // Genera un token aleatorio plano
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Retorna el token sin hashear.
    // La lógica para hashear y guardar en la DB se hará en el controlador.
    return resetToken;
}

export default mongoose.model('User', userSchema);
