import path from 'path';
import { getMetadata } from './resizer';
import { Size } from './types/file';
import { FileInfo, UploadFileInfo } from './types/response';

export const stripEnding = (filename: string): string => filename.substring(0, filename.lastIndexOf('.')) || filename
export const getEnding = (filename: string): string | undefined => filename.split('.').pop()
export const originalPath = (filename: string): string => path.join(__dirname, '..', process.env.PATH_ORIG as string, filename);
export const previewPath = (filename: string): string => path.join(__dirname, '..', process.env.PATH_CROP as string, filename);
export const thumbPath = (filename: string): string => path.join(__dirname, '..', process.env.PATH_THMB as string, filename);
export const newPreviewPath = (filename: string, ending: string, isThumb: boolean): string => path.join(__dirname, '..', (isThumb ? process.env.PATH_THMB : process.env.PATH_CROP) as string, stripEnding(filename) + '.' + ending);
export const previewSize = 800

export function prefillFileInput(file: Express.Multer.File, metadata: any): FileInfo {
    let type, fileType, width, height;

    if (metadata) {
        type = metadata["MIMEType"].split('/')[0];
        fileType = metadata["FileTypeExtension"];
        width = metadata["ImageWidth"]
        height = metadata["ImageHeight"]
    } else {
        type = file.mimetype.split('/')[0];
        fileType = getEnding(file.filename) || file.mimetype.split('/')[1];
    }

    let newSize = { width: 0, height: 0 }
    if (width > height) {
        newSize = { width: 800, height: Math.round((height / width) * 800) }
    } else {
        newSize = { height: 800, width: Math.round((width / height) * 800) }
    }

    return {
        file_name_orig: stripEnding(file.originalname),
        file_name: stripEnding(file.filename),
        size: file.size,
        file_type: fileType,
        width: width,
        height: height,
        width_prev: newSize.width,
        height_prev: newSize.height,
        type: type,
        file_name_full: file.filename
    }
}


export function uploadFileInfos(file: Express.Multer.File): UploadFileInfo {
    return {
        file_name_orig: stripEnding(file.originalname),
        file_name: stripEnding(file.filename),
        size: file.size,
        file_type: getEnding(file.filename) || file.mimetype.split('/')[1],
        type: file.mimetype.split('/')[0],
        file_name_full: file.filename
    }
}

export function getPreviewSize(origSize: Size): Size {
    let newSize = { width: 0, height: 0 }
    if (origSize.width > origSize.height) {
        newSize = { width: previewSize, height: Math.round((origSize.height / origSize.width) * previewSize) }
    } else {
        newSize = { height: previewSize, width: Math.round((origSize.width / origSize.height) * previewSize) }
    }
    return newSize;
}