import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { HttpsError, assertStaffOrAbove, callable } from '../shared.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Replaces Firebase Storage's client-side uploadBytes()/getDownloadURL().
// The Cloudinary API secret never reaches the browser — the client sends the
// raw file here (multipart), authenticated the same way as every other
// endpoint, and this uploads to Cloudinary server-side and returns the URL.
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    assertStaffOrAbove(req.auth)
    const { folder } = req.body ?? {}
    if (!req.file) {
      throw new HttpsError('invalid-argument', 'file is required.')
    }
    if (!folder || typeof folder !== 'string') {
      throw new HttpsError('invalid-argument', 'folder is required.')
    }
    if (!/^image\/|^application\/pdf$/.test(req.file.mimetype)) {
      throw new HttpsError('invalid-argument', 'Only image or PDF files are allowed.')
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `euro-motor/${folder}`, resource_type: 'auto' },
        (err, uploadResult) => (err ? reject(err) : resolve(uploadResult))
      )
      stream.end(req.file.buffer)
    })

    res.json({ url: result.secure_url })
  } catch (err) {
    if (err instanceof HttpsError) {
      res.status(err.httpStatus).json({ error: { code: err.code, message: err.message } })
    } else {
      console.error('Upload failed:', err)
      res.status(500).json({ error: { code: 'internal', message: 'Upload failed.' } })
    }
  }
})

export default router
