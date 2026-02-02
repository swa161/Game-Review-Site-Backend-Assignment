import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as userImage from "../models/user.image.model"
import * as authenticate from "../services/authenticate.model";
import * as user from "../models/user.model"
import * as fs from "fs";
import * as path from "path"

/**
 *  400 id is empty
 *  404 null : given id does not exist
 *  403 forbident: given id and the current auth holder id(current user) does not match
 *  401 Unauthoized
 */

const getImage = async (req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const authUserId =  await authenticate.getAuthenticatedUser(token)
    if (!req.params.id) {
        res.statusMessage = (`Id is missing`);
        res.status(400).send();
        return;
    }
    try {
        const id = parseInt(req.params.id, 10);
        const result = await userImage.getImg(id, authUserId);
        if (result === 'Forbidden') {
            res.status(403).send();
            return;
        }
        if (!result[0].image_filename) {
            res.statusMessage = (`No image with id ${id} found`);
            res.status(404).send();
            return;
        } else {
            const extension = result[0].image_filename.split(".")[1];
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
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const authUserId =  await authenticate.getAuthenticatedUser(token);
    const id = parseInt(req.params.id, 10);
    const extension = req.headers["content-type"].split("/")[1].toLowerCase();
    const mimeType = ["jpg", "png", "jpeg", "gif"];
    const contenttype = req.headers["content-type"];
    if (!token) {
        res.status(401).send("Need to login");
        return;
    }
    if (!id) {
        res.statusMessage = (`Id is missing`);
        res.status(400).send();
        return;
    }

    if (!mimeType.includes(extension)) {
        res.statusMessage = (`Invalid extension type`);
        res.status(400).send();
        return;
    }

    const userInfo = await  user.getOneUser(id, authUserId);
    const imgName = `${id}.${extension}`;


    try {
        const result = await userImage.updateImg(id, authUserId, imgName);
        if (!result) {
            res.status(404).send();
            return;
        }
        if (result.code === 403) {
            res.status(403).send();
            return;
        } else if (result.code === 200) {
            res.status(200).send();
            return;

        } else if (result.code === 201) {
            res.status(201).send();
            return;
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const deleteImage = async (req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const authUserId =  await authenticate.getAuthenticatedUser(token)
    if (!req.params.id) { // id is missing
        res.statusMessage = "Id is missing";
        res.status(400).send();
        return;
    }
    const id = parseInt(req.params.id, 10);
    try {
        const result = await userImage.deleteImg(id, authUserId);
        if (result === 'Forbidden') { // Unauthorized
            res.status(403).send();
            return;
        }
        if (!result) { // Invalid ID
            res.status(404).send();
            return;
        }
        res.statusMessage = "Deletion successful";
        res.status(200).send();
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {getImage, setImage, deleteImage}