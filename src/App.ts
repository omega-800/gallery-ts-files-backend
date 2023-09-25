import express from 'express'
import cors from 'cors'
import upload from './upload'
import { resizeImg } from './resizer'
import sharp from 'sharp'
import path from 'path'
import { FileInfo, Response } from './types'
import "dotenv/config"
import fs from 'fs'

const app = express()
app.use(express.json())
app.use(cors())

app.post(process.env.ENDPOINT_UPLOAD as string, upload.array('files'), async (req, res) => {
    // Handle the uploaded file
    let response: Response = {
        msg: 'File uploaded successfully!',
        err: []
    };
    let fileInfos: FileInfo[] = []
    if (req.files) {
        for (let file of Object.values(req.files)) {
            console.log(`Received file ${file.originalname}`);
            let filePath = path.join(__dirname, '..', process.env.PATH_ORIG as string, file.filename);
            let metadata = await sharp(filePath).metadata();
            let fileInfo: FileInfo = {
                original_name: file.originalname,
                new_name: file.filename,
                path: file.path,
                width: metadata.width || 0,
                height: metadata.height || 0,
                type: file.mimetype.split('/')[0],
                file_type: metadata.format || file.mimetype.split('/')[1]
            }
            if (file.mimetype.split('/')[0] == 'image') {
                try {
                    resizeImg(file.filename)
                    fileInfo.preview_path = process.env.PATH_CROP as string + '/' + file.filename
                } catch (err) {
                    response.err.push('Resizing failed for ' + file.filename)
                }
            }
            fileInfos.push(fileInfo)
            /*if (file.type.split('/')[0] == 'video')*/
        }
        response.files = fileInfos;
    } else {
        response = { msg: "No files", err: ["!req.files"] }
    }
    res.json(response);
})

// app.use('/preview', express.static('previews'))
app.get(process.env.PATH_CROP as string, (req, res) => {
    // do a bunch of if statements to make sure the user is 
    // authorized to view this image, then

    const imageName = req.params.imageName
    const readStream = fs.createReadStream(`${process.env.PATH_CROP}/${imageName}`)
    readStream.pipe(res)
})

export default app