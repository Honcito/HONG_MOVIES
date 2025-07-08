import User from "../models/User.js";
import { generateJWT } from "../utils/generateJWT.js";

// Register a new user
export async function register(req, res, next) {
  try {
    const { username, email, password, rol } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Create and save the new user
    const user = new User({ username, email, password, rol });
    const savedUser = await user.save();

    // Generate JWT token
    const token = generateJWT(savedUser);

    // Send token as a secure cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "strict",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        rol: savedUser.rol,
      },
    });
  } catch (error) {
    console.error("Error in registration:", error);
    next(error);
  }
}

// Login an existing user
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    const token = generateJWT(user);

    // Send token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    next(error);
  }
}

// Logout
export async function logout(req, res) {
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully" });
}
