import Upload from "../models/Upload.js";

export const uploadFile = async (req, res) => {
  try{
    const upload = await Upload.create({
      user: req.user,
      fileName: req.file.originalname,
      filePath: req.file.path,
      analysis: {}
    });
    res.json(upload);
  }catch(err){
    res.status(500).json({ message:'Upload failed' });
  }
};

export const getUserUploads = async (req, res) => {
  try{
    const uploads = await Upload.find({ user: req.user }).sort({ createdAt: 1 });
    res.json(uploads);
  }catch(err){
    res.status(500).json({ message:'Error fetching uploads' });
  }
};
