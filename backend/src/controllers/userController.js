import User from "../models/User.js";

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
