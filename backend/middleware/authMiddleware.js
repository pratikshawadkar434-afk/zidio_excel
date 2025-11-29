import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  if(!token) return res.status(401).json({ message:'Not authorized, no token' });
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id;
    next();
  }catch(err){
    return res.status(401).json({ message:'Not authorized, invalid token' });
  }
};
