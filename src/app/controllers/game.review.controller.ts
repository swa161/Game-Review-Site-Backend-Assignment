import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as gameReview from "../models/game.review.model"
import {validate} from "../services/validator"
import * as schema from "../resources/schemas.json"
import * as authenticate from "../services/authenticate.model";

const getGameReviews = async(req: Request, res: Response): Promise<void> => {
    const gameId = parseInt(req.params.id, 10);
    try {
        if (!gameId) {
            res.status(404).send("Game ID empty");
            return;
        }

        const result = await gameReview.getGameReview(gameId);
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGameReview = async(req: Request, res: Response): Promise<void> => {
    const token: string | string[] = req.headers["x-authorization"];
    const validation = await validate(schema.game_review_post, req.body);
    if (!token) {
        res.status(401).send("Need to login");
    }
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }
    // Check valid game ID
    const gameId = parseInt((req.params.id), 10);
    if (isNaN(gameId)) {
        res.statusMessage = `Invalid game ID`
        res.status(400).send();
        return;
    }
    const authUserId = await authenticate.getAuthenticatedUser(token);
    const rating = req.body.rating;
    const review = req.body.review;
    try {
        const result = await gameReview.insertReview(authUserId, gameId, rating, review);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}




export {getGameReviews, addGameReview};