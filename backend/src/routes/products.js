const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `import_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx, .xls) veya CSV dosyası yüklenebilir'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

router.get('/', auth, productController.getAll);
router.get('/barcode/:barcode', auth, productController.getByBarcode);
router.get('/:id', auth, productController.getById);

router.post('/', auth, roleCheck('admin'), productController.create);
router.post('/import/excel', auth, roleCheck('admin'), upload.single('file'), productController.importExcel);
router.put('/:id', auth, roleCheck('admin'), productController.update);
router.delete('/:id', auth, roleCheck('admin'), productController.remove);

module.exports = router;
