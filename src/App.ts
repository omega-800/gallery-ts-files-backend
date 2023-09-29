import express from 'express'
import cors from 'cors'
import upload from './upload'
import { createImgPreview, createImgThumbnail, createVideoPreview, createVideoPreviewImg, getMetadata } from './resizer'
import path from 'path'
import "dotenv/config"
import fs from 'fs'
import { getPreviewSize, newPreviewPath, originalPath, previewPath, thumbPath, uploadFileInfos } from './util'
import { Size } from './types/file'
import { sendError, sendErrorSSE } from './error'

const app = express()
app.use(express.json())
app.use(cors())

app.post(process.env.ENDPOINT_SINGLEUPLOAD as string, upload.single('file'), async (req, res) => {
    if (!req.file) {
        sendError(res, 400, 'Error: No file supplied')
        return;
    }
    console.log(`Received file ${req.file.originalname}`);
    if (!['video', 'image'].includes(req.file.mimetype.split('/')[0])) {
        sendError(res, 418, 'Error: File type not supported')
        return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.json(uploadFileInfos(req.file));
})

app.get(process.env.ENDPOINT_CREATECROP as string + '/:file', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    //res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client

    let fileName = req.params.file
    if (!fileName) {
        sendErrorSSE(res, 400, 'Error: No file supplied')
        return;
    }

    /*if (typeof fileName != "string") {
        sendErrorSSE(res, 400, 'Error: Filename must be a string')
        return;
    }*/

    if (!fs.existsSync(originalPath(fileName))) {
        sendErrorSSE(res, 404, 'Error: File not found')
        return;
    }
    console.log(`Creating previews for ${fileName}`);

    try {
        res.write(`data: ${JSON.stringify({ percent: 5, msg: 'Getting metadata' })}\n\n`)
        const metadata = JSON.parse(await getMetadata(fileName))[0]
        const type = metadata["MIMEType"].split('/')[0];
        const fileDimesions: Size = { width: metadata["ImageWidth"], height: metadata["ImageHeight"] }
        const newSize = getPreviewSize(fileDimesions)
        let fileInfo: any = {
            width: fileDimesions.width,
            height: fileDimesions.height,
            width_prev: newSize.width,
            height_prev: newSize.height,
        }
        res.write(`data: ${JSON.stringify({ percent: 15, msg: 'Got metadata' })}\n\n`)

        if (type == 'image') {
            try {
                res.write(`data: ${JSON.stringify({ percent: 20, msg: 'Creating image preview' })}\n\n`)
                await createImgPreview(fileName, newSize);
                res.write(`data: ${JSON.stringify({ percent: 50, msg: 'Created image preview' })}\n\n`)
                console.log(`createImgPreview(${fileName})`);
            } catch (err) {
                sendErrorSSE(res, 500, `Creating Preview failed for ${fileName} ERRORS: ${err}`)
                return;
            }
            try {
                res.write(`data: ${JSON.stringify({ percent: 60, msg: 'Creating image thumbnail' })}\n\n`)
                await createImgThumbnail(fileName)
                res.write(`data: ${JSON.stringify({ percent: 90, msg: 'Created image thumbnail' })}\n\n`)
                console.log(`createImgThumbnail(${fileName})`);
            } catch (err) {
                sendErrorSSE(res, 500, `Creating Thumbnail failed for ${fileName} ERRORS: ${err}`)
                return;
            }
        } else if (type == 'video') {
            const newFps = 12;
            let duration = metadata["Duration"]; //29.97 (in seconds)
            let fps = metadata["VideoFrameRate"]; //24.996
            fileInfo = {
                ...fileInfo,
                fps: fps,
                fps_prev: newFps,
                duration: duration
            }
            try {
                res.write(`data: ${JSON.stringify({ percent: 20, msg: 'Creating video preview' })}\n\n`)
                await createVideoPreview(fileName, newSize, newFps)
                res.write(`data: ${JSON.stringify({ percent: 45, msg: 'Created video preview' })}\n\n`)
                console.log(`createVideoPreview(${fileName})`);
            } catch (err) {
                sendErrorSSE(res, 500, `Creating Preview Video failed for ${fileName} ERRORS: ${err}`)
                return;
            }
            try {
                res.write(`data: ${JSON.stringify({ percent: 50, msg: 'Creating video preview image' })}\n\n`)
                await createVideoPreviewImg(fileName)
                res.write(`data: ${JSON.stringify({ percent: 75, msg: 'Created video preview image' })}\n\n`)
                console.log(`createVideoPreviewImg(${fileName})`);
            } catch (err) {
                sendErrorSSE(res, 500, `Creating Preview Image failed for ${fileName} ERRORS: ${err}`)
                return;
            }
            try {
                res.write(`data: ${JSON.stringify({ percent: 80, msg: 'Creating video thumbnail image' })}\n\n`)
                await createImgThumbnail(fileName)
                res.write(`data: ${JSON.stringify({ percent: 95, msg: 'Created video thumbnail image' })}\n\n`)
                console.log(`createImgThumbnail(${fileName})`);
            } catch (err) {
                sendErrorSSE(res, 500, `Creating Thumbnail failed for ${fileName} ERRORS: ${err}`)
                return;
            }
        } else {
            sendErrorSSE(res, 418, 'Error: File type not supported')
            return;
        }
        res.write(`data: ${JSON.stringify({ percent: 100, msg: 'Preview generation done', data: fileInfo })}\n\n`)
        sendErrorSSE(res, 414, `Connection is lasting too long`)
        res.end()
    } catch (err) {
        sendErrorSSE(res, 418, `Getting metadata failed for ${fileName} ERRORS: ${err}`)
    }

    // If client closes connection, stop sending events
    res.on('close', () => {
        console.log('client dropped me');
        res.end();
    });
})

app.get('/streamtest', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    //res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client

    let counter = 0;
    let interValID = setInterval(() => {
        counter++;
        if (counter >= 10) {
            clearInterval(interValID);
            res.end(); // terminates SSE session
            return;
        }
        res.write(`data: ${JSON.stringify({ num: counter })}\n\n`); // res.write() instead of res.send()
    }, 100);

    // If client closes connection, stop sending events
    res.on('close', () => {
        console.log('client dropped me');
        clearInterval(interValID);
        res.end();
    });
})

// app.use('/preview', express.static('previews'))
app.get('/' + process.env.PATH_CROP as string + '/:fileName/:thumb?', (req, res) => {
    // do a bunch of if statements to make sure the user is 
    // authorized to view this image, then

    let isThumb = req.params.thumb && req.params.thumb == 'thumbnail' && req.params.fileName.endsWith('webp')
    const readStream = fs.createReadStream(isThumb ? thumbPath(req.params.fileName) : previewPath(req.params.fileName))
    readStream.on('open', function () {
        res.setHeader('Content-Type', req.params.fileName.endsWith('webp') ? 'image/webp' : 'video/webm');
        readStream.pipe(res);
    });
    readStream.on('error', function () {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 404;
        res.end('Not found');
    });
})

export default app


/* app.post(process.env.ENDPOINT_UPLOAD as string, upload.array('files'), async (req, res) => {
    // Handle the uploaded file
    let response: Response = {
        msg: 'Files uploaded successfully!',
        err: []
    };
    let fileInfos: JSON[] = []
    if (req.files) {
        for (let file of Object.values(req.files)) {
            console.log(`Received file ${file.originalname}`);
            let metadata;
            try {
                metadata = JSON.parse(await getMetadata(file.filename))[0]
            } catch (err) {
                console.error(err)
                response.err.push(`Getting metadata failed for ${file.filename} ERRORS: ${err}`)
            }

            let fileInput = prefillFileInput(file, metadata);

            if (fileInput.type == 'image') {
                let imageInput;
                try {
                    await createImgPreview(file.filename, { width: fileInput.width_prev, height: fileInput.height_prev });
                    await createImgThumbnail(file.filename)
                    imageInput = fileInput
                } catch (err) {
                    console.error(err)
                    response.err.push(`Resizing failed for ${file.filename} ERRORS: ${err}`)
                }
                if (imageInput) {
                    try {
                        let createdImage = await addImageToDB(imageInput)
                        fileInfos.push(createdImage)
                    } catch (err) {
                        console.error(err)
                        response.err.push(`Uploading to DB failed for ${file.filename} ERRORS: ${err}`)
                    }
                }
            } else if (fileInput.type == 'video') {
                let videoInput;
                let duration = metadata["Duration"]; //29.97 (in seconds)
                let fps = metadata["VideoFrameRate"]; //24.996
                try {
                    await createVideoPreview(file.filename, { width: fileInput.width_prev, height: fileInput.height_prev }, 12)
                    await createVideoPreviewImg(file.filename)
                    await createImgThumbnail(file.filename)
                    videoInput = {
                        ...fileInput,
                        fps: fps,
                        fps_prev: 12,
                        duration: duration
                    }
                } catch (err) {
                    console.error(err)
                    response.err.push(`Resizing failed for ${file.filename} ERRORS: ${err}`)
                }
                if (videoInput) {
                    try {
                        let createdVideo = await addVideoToDB(videoInput)
                        fileInfos.push(createdVideo)
                    } catch (err) {
                        console.error(err)
                        response.err.push(`Uploading to DB failed for ${file.filename} ERRORS: ${err}`)
                    }
                }
            } else {
                response.err.push(`Unsupported file type for ${file.filename}`)
            }
        }
        response.files = fileInfos;
    } else {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 400;
        res.end('No files supplied');
    }
    if (response.err.length > 0) response.msg = "Errors occured!"
    res.json(response);
}) */