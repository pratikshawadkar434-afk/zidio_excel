import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref:'User' },
  fileName: String,
  filePath: String,
  analysis: Object
}, { timestamps:true });

export default mongoose.model('Upload', uploadSchema);
