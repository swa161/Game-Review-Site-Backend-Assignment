import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as gameAction from "../models/game.action.model"
import * as authenticate from "../services/authenticate.model";
import {getAuthenticatedUser} from "../services/authenticate.model";
import {removeFromOwn, removFromWishlist} from "../models/game.action.model";


const addGameToWishlist = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const gameId = Number(req.params.id);
    const userByToken = await authenticate.getAuthenticatedUser(token);
    if (userByToken === null) {
        res.status(401).send();
        return;
    }
    if (!gameId) {
        res.status(400).send("Game ID is empty");
        return;
    }
    if (isNaN(gameId)) {
        res.status(400).send("Invalid game ID");
        return;
    }
    try {
        const result = await gameAction.addToWishlist(gameId, userByToken);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameToOwned = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const gameId = Number(req.params.id);
    const userByToken = await authenticate.getAuthenticatedUser(token);
    if (userByToken === null) {
        res.status(401).send();
        return;
    }
    if (!gameId) {
        res.status(400).send("Game ID is empty");
        return;
    }
    if (isNaN(gameId)) {
        res.status(400).send("Invalid game ID");
        return;
    }
    try {
        const result = await gameAction.addToOwn(gameId, userByToken);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromOwned = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const userByToken = await authenticate.getAuthenticatedUser(token);
    const gameId = Number(req.params.id);
    if (!userByToken) {
        res.status(401).send();
        return;
    }

    if (userByToken === null) {
        res.status(401).send();
        return;
    }
    if (!gameId) {
        res.status(400).send("Game ID is empty");
        return;
    }
    if (isNaN(gameId)) {
        res.status(400).send("Invalid game ID");
        return;
    }

    try {
        const result = await  gameAction.removeFromOwn(gameId, userByToken);
        if (result === 403) {
            res.status(403).send();
            return;
        } else if (result === 200) {
            res.status(200).send(result);
            return;
        }

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const removeGameFromWishlist = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const userByToken = await authenticate.getAuthenticatedUser(token);
    const gameId = Number(req.params.id);

    if (userByToken === null || !token) {
        res.status(401).send();
        return;
    }
    if (!gameId) {
        res.status(400).send("Game ID is empty");
        return;
    }
    if (isNaN(gameId)) {
        res.status(400).send("Invalid game ID");
        return;
    }
    try {
        const result = await gameAction.removFromWishlist(gameId, userByToken);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {addGameToWishlist, removeGameFromWishlist, addGameToOwned, removeGameFromOwned};