export interface Response {
    msg: string
    err: string[]
    files?: JSON[]
}

export interface UploadFileInfo {
    file_name_orig: string,
    file_name_full: string,
    file_name: string,
    size: number,
    file_type: string,
    type: string
}

export interface PreviewFileInfo {
    width: number,
    height: number,
    width_prev: number,
    height_prev: number,
}

export interface FileInfo extends UploadFileInfo, PreviewFileInfo {
}