import express from "express";
import multer from "multer";
import { uploadFile, getUserUploads } from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb){ cb(null, 'uploads/'); },
  filename(req, file, cb){ cb(null, `${Date.now()}-${file.originalname}`); }
});
const upload = multer({ storage });

router.post('/', protect, upload.single('file'), uploadFile);
router.get('/', protect, getUserUploads);

export default router;
