const router = require('express').Router();
const movementController = require('../controllers/movementController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, movementController.getAll);
router.post('/out', auth, movementController.stockOut);
router.post('/in', auth, roleCheck('admin'), movementController.stockIn);

module.exports = router;
