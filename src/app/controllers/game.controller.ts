import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as game from "../models/game.model"
import {validate} from "../services/validator"
import * as schema from "../resources/schemas.json"
import * as authenticate from "../services/authenticate.model";

const getAllGames = async(req: Request, res: Response): Promise<void> => {
    const currentToken: string | string[] = req.headers["x-authorization"];
    const authUserId = await authenticate.getAuthenticatedUser(currentToken);
    const parameters = Object.keys(req.query)
    const {startIndex, count, q='', genreIds, price, platformIds, creatorId, reviewerId, sortBy, ownedByMe=false, wishlistedByMe} = req.query
    const genreArray = Array.isArray(genreIds) ? genreIds.map(Number): [Number(genreIds)];
    const platformArray = Array.isArray(platformIds) ? platformIds.map(Number): [Number(platformIds)];
    // const maxPlatformId = await game.getMaxPlatformId();
    const validation = await validate(schema.game_search, req.query);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }

    if (Number(platformIds) > 50) {
        res.status(400).send();
        return;
    }
    try {
        const result = await game.getAllGames();
        let filteredGames = result.games;
        if (parameters.length < 1) {
            const resultAllGames = await game.getAllGames();
            res.status(200).send(resultAllGames);
            return;
        }
        if (q) {
            filteredGames = filteredGames.filter((g: any) =>
                g.title.toLowerCase()?.includes(q) ||
                g.description.toLowerCase()?.includes(q)
            );
        }
        if (price !== undefined) {
            const filterPrice = Number(price);
            filteredGames = filteredGames.filter((g: any) => (g.price <= filterPrice));
        }

        if (reviewerId) {
            const reviewerIdNum = Number(reviewerId);
            filteredGames = filteredGames.filter((g: any) => (g.reviewerIds.includes(reviewerIdNum)));
        }

        if (genreIds) {
            filteredGames = filteredGames.filter((g: any) => genreArray.includes(g.genreId));

        }
        if (platformIds) {
            filteredGames = filteredGames.filter((g: any) =>
               platformArray.some((platformId: number) => g.platformIds.includes(platformId)));

        }
        if (ownedByMe) {
            if (authUserId === null) {
                res.status(401).send();
                return;
            }
            filteredGames = filteredGames.filter((g: any) => g.ownedBy.includes(authUserId))
        }
        if (authUserId !== null) {
            if (wishlistedByMe) {
                // Apply the wishlist filter if wishlistedByMe is true
                filteredGames = filteredGames.filter((g: any) => g.wishlistUsers.includes(authUserId));
            }
        }

        if (sortBy) {
            const sortOptions: { [key: string]: (a: any, b: any) => number } = {
                ALPHABETICAL_ASC: (a, b) => a.title.localeCompare(b.title),
                ALPHABETICAL_DESC: (a, b) =>  b.title.localeCompare(a.title),
                PRICE_ASC: (a, b) => {
                    const priceComparison = a.price - b.price;
                    if (priceComparison !== 0) return priceComparison;
                    return a.gameId - b.gameId;
                },
                PRICE_DESC: (a, b) => {
                    const priceComparison = b.price - a.price;
                    if (priceComparison !== 0) return priceComparison;
                    return a.gameId - b.gameId;
                },
                CREATED_ASC: (a, b) => {
                    const dateComparison = new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
                    if (dateComparison !== 0) return dateComparison;
                    return a.gameId - b.gameId;
                },
                CREATED_DESC: (a, b) => {
                    const dateComparison = new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
                    if (dateComparison !== 0) return dateComparison;
                    return a.gameId - b.gameId;
                },
                RATING_ASC: (a, b) => {
                    const ratingComparison = a.rating - b.rating;
                    if (ratingComparison !== 0) return ratingComparison;
                    return a.gameId - b.gameId;
                },
                RATING_DESC: (a, b) => {

                    const ratingComparison = b.rating - a.rating;
                    if (ratingComparison !== 0) return ratingComparison;
                    return a.gameId - b.gameId;
                }
            }
            if (sortOptions[sortBy as string]) {
                filteredGames.sort(sortOptions[sortBy as string]);
            }
        }

        if (startIndex !== undefined || count !== undefined) {
            const start = Number(startIndex);
            const countNumber = Number(count);
            const paginatedGames = filteredGames.slice(start, start + countNumber);
            res.status(200).send({games: paginatedGames, count: filteredGames.length});
            return;
        }

        res.status(200).send({games: filteredGames, count: filteredGames.length});

    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getGame = async(req: Request, res: Response): Promise<void> => {
    try {
        const gameId = parseInt(req.params.id, 10);
        const gameIdsFromDB = await game.getMaxGameId();
        if (isNaN(gameId)) {
            res.status(400).send("Invalid game ID");
            return;
        }
        if (!(gameIdsFromDB.includes(gameId))) {
            res.status(404).send("No game with id " + gameId);
        }
        const result = await game.getGameById(gameId);
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const addGame = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const validation = await validate(schema.game_post, req.body);
    const userByToken = await authenticate.getAuthenticatedUser(token);
    const maxPlatform = await game.getMaxPlatformId();
    const {title, description, genreId, price, platformIds} = req.body;
    if (userByToken === null) {
        res.status(401).send();
        return;
    }
    if (validation !== true) { // Bad format
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }

    if (req.body.platformIds.some((platform: number) => platform > maxPlatform)) {
        res.status(400).send("Invalid platform id");
        return;
    }
    try {
        const result = await game.addOneGame(title, description, genreId, price, userByToken, platformIds);
        res.status(201).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


const editGame = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const {title, description, genreId, price, platforms} = req.body;
    const validation = await validate(schema.game_patch, req.body);
    const gameID = parseInt(req.params.id, 10);
    const loggedInUser = await authenticate.getAuthenticatedUser(token);
    const gameIds = await game.getMaxGameId();
    if (token === null) {
        res.status(401).send('Unauthorized');
    }

    if (!(gameIds.includes(gameID))) {
        res.status(404).send();
        return
    }
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }

    if (isNaN(gameID)) {
        res.statusMessage = "Invalid game ID";
        res.status(400).send();
        return;
    }
    try {
        const result = await game.patchGame(gameID, loggedInUser, title, description, genreId, price, platforms);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const deleteGame = async(req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const gameId = parseInt(req.params.id, 10);

    const gameIdsFromDB = await game.getMaxGameId();
    if (!(token)) {
        res.status(401).send('Unauthorized');
        return;
    }
    if(isNaN(gameId)) {
        res.status(400).send("Invalid game ID");
        return;
    }
    if(!(gameIdsFromDB.includes(gameId))) {
        res.status(404).send("No game found with id");
        return;
    }


    try {
        const userId = await authenticate.getAuthenticatedUser(token);
        const result = await game.removeGame(gameId, userId);
        res.status(result.status).send(result.message);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


const getGenres = async(req: Request, res: Response): Promise<void> => {
    try {
        const result = await game.getAllgenres();
        const updatedResult = result.map(({id, name}: {id: number; name: string}) => ({genreId: id, name})
        );
        res.status(200).send(updatedResult);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const getPlatforms = async(req: Request, res: Response): Promise<void> => {
    try {
        const result = await game.getAllplatform();
        const updatedResult = result.map(({id, name}: {id: number; name: string}) => ({platformId: id, name})
        );
        res.status(200).send(updatedResult);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}


export {getAllGames, getGame, addGame, editGame, deleteGame, getGenres, getPlatforms};