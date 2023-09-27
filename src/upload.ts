import multer from 'multer'
import "dotenv/config"

function validTrackFormat(trackMimeType: string) {
    var mimetypes = ["video/mp4"];
    var types = ["video", "image"];
    return types.indexOf(trackMimeType.split('/')[0]) > -1;
}

function trackFileFilter(req: Express.Request, file: Express.Multer.File, cb: any) {
    cb(null, validTrackFormat(file.mimetype));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.PATH_ORIG as string + '/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    //fileFilter: trackFileFilter
});

export default upload