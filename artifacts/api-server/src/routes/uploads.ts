import { Router } from "express";
import multer from "multer";
import { uploadToSpaces } from "../lib/spaces.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

router.post("/v1/uploads/image", upload.single("image"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }
  try {
    const url = await uploadToSpaces(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "products"
    );
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Failed to upload image to Spaces");
    res.status(500).json({ error: "Image upload failed" });
  }
});

export default router;
