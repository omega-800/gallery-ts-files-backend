import sharp from 'sharp'
import path from 'path'
import "dotenv/config"

export function resizeImg(filename: string) {
    sharp(path.join(__dirname, '..', process.env.PATH_ORIG as string, filename))
        .resize(250)
        .toFile(path.join(__dirname, '..', process.env.PATH_CROP as string, filename))
        .then(function (newFileInfo) {
            // newFileInfo holds the output file properties
            //console.log("Success: ", newFileInfo)
        })
        .catch(function (err) {
            console.log("Error occured: ", err);
            throw new Error(err)
        });
}