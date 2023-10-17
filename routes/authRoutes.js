const { Router } = require("express");
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/authMiddleware");
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/profile_pictures"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validImageTypes = ["image/png", "image/jpeg", "image/gif"];
    const actualSize = parseInt(req.headers["content-length"]);

    if (!validImageTypes.includes(file.mimetype)) {
      return cb(new Error("File size exceeded, maximum is 10 MB."), false);
    } else if (actualSize > 11 * 1024 * 1024) {
      return cb(new Error("File size exceeded, maximum is 10 MB."), false);
    } else {
      cb(null, true);
    }
  },
});

const router = Router();

router.get("/signup", authController.signup_get);
router.post("/signup", upload.single("image"), authController.signup_post);
router.get("/login", authController.login_get);
router.post("/login", authController.login_post);
router.get("/logout", authController.logout_get);

module.exports = router;
