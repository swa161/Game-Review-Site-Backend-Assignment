import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as gameImg from "../models/game.image.model"
import * as authenticate from "../services/authenticate.model";
const getImage = async (req: Request, res: Response): Promise<void> => {
    const gameId = parseInt(req.params.id, 10);
    try {
        const result = await gameImg.getImage(gameId);
        if (!result) {
            res.status(404).send({})
            return;
        }
        const extension = result[0].image_filename.split(".")[1];
        if (extension === "jpg") {
            res.setHeader("Content-Type", `image/jpeg`);
            res.status(200).send();
        } else {
            res.setHeader("Content-Type", `image/${extension}`);
            res.status(200).send();
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const setImage = async (req: Request, res: Response): Promise<void> => {
    const token: string | string[] = req.headers["x-authorization"];
    const authUserId = await authenticate.getAuthenticatedUser(token);
    const extension = req.headers["content-type"].split("/")[1].toLowerCase();
    const mimeType = ["jpg", "png", "jpeg", "gif"];
    if (!token) {
        res.status(401).send("Need to login");
        return;
    }
    try {
        const gameId = parseInt(req.params.id, 10);
        if (!gameId) {
            res.status(400).send({}) // Game id not provided
            return;
        }
        const filename = `${gameId}.${extension}`;
        const result = await gameImg.updateImage(gameId, filename, authUserId);
        if (result === 404) {
            res.status(404).send({})
            return;
        }
        if (!mimeType.includes(extension)) {
            res.status(404).send({})
            return;
        }
        switch (result) {
            case 403:
                res.status(403).send();
                return;
            case 200:
                res.status(200).send();
                return;
            case 201:
                res.status(201).send();
                return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {getImage, setImage};