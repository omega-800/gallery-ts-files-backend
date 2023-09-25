import multer from 'multer'
import "dotenv/config"

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.PATH_ORIG as string + '/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

export default upload