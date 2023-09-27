import { Response } from "express";

export function sendError(res: Response, error: number, message: string) {
    console.error(message)
    res.setHeader('Content-Type', 'text/plain');
    res.statusCode = error;
    res.end(message);
}
export function sendErrorSSE(res: Response, error: number, message: string) {
    console.error(message)
    res.write(JSON.stringify({ error: error, msg: message }))
    res.statusCode = error;
    res.end(message);
}