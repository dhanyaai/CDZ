import { Router } from "express";
import multer from "multer";
import { uploadToSpaces } from "../lib/spaces.js";

const router = Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/",
      "application/pdf",
      "application/postscript",
      "application/illustrator",
      "image/svg+xml",
      "application/zip",
      "application/x-zip-compressed",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const ok = allowed.some((t) =>
      t.endsWith("/") ? file.mimetype.startsWith(t) : file.mimetype === t
    );
    if (ok) cb(null, true);
    else cb(null, true);
  },
});

router.post("/v1/uploads/image", imageUpload.single("image"), async (req, res): Promise<void> => {
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

router.post("/v1/uploads/file", fileUpload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }
  try {
    const url = await uploadToSpaces(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      "attachments"
    );
    res.json({ url, name: req.file.originalname, type: req.file.mimetype });
  } catch (err) {
    req.log.error({ err }, "Failed to upload file to Spaces");
    res.status(500).json({ error: "File upload failed" });
  }
});

export default router;
