import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

export const registerUser = async (req, res) => {
  try{
    const { name, email, password } = req.body;
    if(!name || !email || !password)
      return res.status(400).json({ message:'Please provide all fields' });
    const exists = await User.findOne({ email });
    if(exists) return res.status(400).json({ message:'User already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.json({ _id:user._id, name:user.name, email:user.email, token: tokenFor(user._id) });
  }catch(err){
    res.status(500).json({ message:'Server error' });
  }
};

export const loginUser = async (req, res) => {
  try{
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({ message:'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({ message:'Invalid credentials' });
    res.json({ _id:user._id, name:user.name, email:user.email, token: tokenFor(user._id) });
  }catch(err){
    res.status(500).json({ message:'Server error' });
  }
};
