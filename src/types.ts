
export interface Response {
    msg: string
    err: string[]
    files?: FileInfo[]
}

export interface FileInfo {
    original_name: string
    new_name: string
    path: string
    preview_path?: string
    type: string,
    file_type: string
    width: number
    height: number
}