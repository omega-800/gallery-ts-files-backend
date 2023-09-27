import sharp from 'sharp'
import path from 'path'
import "dotenv/config"
import { Size } from './types/file';
import { originalPath, newPreviewPath, stripEnding, previewPath } from './util';
import fs from 'fs'
import util from 'util'
import { execFile } from 'child_process'
import exiftool from 'dist-exiftool'
import ffmpeg from 'fluent-ffmpeg';

export const imgPreviewType = 'webp'
export const vidPreviewType = 'webm'
export const webpCompression = { nearLossless: true, quality: 50 }

export async function createImgPreview(filename: string, newSize: any): Promise<Size> | never {
    let newFileInfo = await sharp(originalPath(filename))
        .resize(newSize.width, newSize.height)
        .webp(webpCompression)
        .toFile(newPreviewPath(filename, imgPreviewType, false));

    return { height: newFileInfo.height, width: newFileInfo.width };
}

export async function createImgThumbnail(origFilename: string) {
    let newFileInfo = await sharp(newPreviewPath(origFilename, imgPreviewType, false))
        .resize(100, 100, { fit: 'cover' })
        .webp(webpCompression)
        .toFile(newPreviewPath(origFilename, imgPreviewType, true));
}

export async function getMetadata(filename: string): Promise<any> | never {
    let filePath = originalPath(filename)
    let { stdout, stderr } = await util.promisify(execFile)(exiftool, ['-json', '-n', filePath])
    if (stderr) throw new Error(stderr)
    return stdout;
}

export async function createVideoPreview(filename: string, newSize: any, newFps: number): Promise<void> | never {
    return new Promise((resolve, reject) => {
        ffmpeg(originalPath(filename))
            .format(vidPreviewType)
            .size(`${newSize.width || '?'}x${newSize.height || '?'}`)
            .fps(newFps)
            .addOptions(["-crf 28", "-c:v libvpx"])
            .save(newPreviewPath(filename, vidPreviewType, false))
            .on('end', () => { resolve(); })
            .on('error', (err) => {
                console.error(err)
                return reject(new Error(err))
            })
    })
}

export async function createVideoPreviewImg(filename: string): Promise<void> | never {

    let filePath = newPreviewPath(filename, vidPreviewType, false) //originalPath(filename)
    //let { stdout, stderr } = await util.promisify(execFile)(path.resolve('ffmpeg/bin/ffmpeg.exe'), ['-i', filePath, '-filter:v', `scale=${newW}:${newH}`, '-c:a', 'copy', ''])
    //if (stderr) throw new Error(stderr)
    //return stdout;

    return new Promise((resolve, reject) => {
        ffmpeg(filePath)
            .screenshots({
                count: 1,
                filename: stripEnding(filename) + '.png',
                folder: newPreviewPath('', '', false),
            })
            .on('end', async function () {
                await sharp(newPreviewPath(filename, 'png', false))
                    .webp(webpCompression)
                    .toFile(newPreviewPath(filename, imgPreviewType, false));
                fs.unlinkSync(newPreviewPath(filename, 'png', false))
                resolve();
            })
            .on('error', (err) => {
                console.error(err)
                return reject(new Error(err))
            })
    })
}