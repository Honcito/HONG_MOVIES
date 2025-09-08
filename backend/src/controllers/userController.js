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
    const { username, email, rol } = req.body;
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "req body params is empty" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, rol },
      {
        new: true,
      }
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error in updateUser", error);
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
