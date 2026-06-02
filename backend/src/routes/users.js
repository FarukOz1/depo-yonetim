const router = require('express').Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.get('/', auth, roleCheck('admin'), userController.getAll);
router.post('/', auth, roleCheck('admin'), userController.create);
router.put('/:id', auth, roleCheck('admin'), userController.update);
router.delete('/:id', auth, roleCheck('admin'), userController.remove);

module.exports = router;
