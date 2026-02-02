import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import * as checkID from "../services/checkValidId"

const addToWishlist = async (gameId: number, userId: number): Promise<any> => {
    Logger.info(`Adding to wishlist`);
    const conn = await getPool().getConnection();
    try {
        const [getCreatorId] = await conn.query(`SELECT creator_id FROM game WHERE id = ?`, [gameId]);
        const isValidGameId = await checkID.gameValidId(gameId);
        if (isValidGameId === null) {
            return {status: 404, message: "No game with id"}
        }
        if (getCreatorId[0].creator_id === userId) {
            return {status: 403, message: "Cannot mark a game you created as owned"}
        }
        await conn.query(`INSERT INTO wishlist (game_id, user_id)
                                                VALUES (?,?)`, [gameId, userId]);
        return {status: 200, message: "Successfully added to own"};
    } finally {
        await conn.release();
    }
}
const addToOwn = async (gameId: number, userId: number): Promise<any> => {
    Logger.info(`Adding to own`);
    const conn = await getPool().getConnection();
    try {
        const [getCreatorId] = await conn.query(`SELECT creator_id
                                                 FROM game
                                                 WHERE id = ?`, [gameId]);
        if (getCreatorId.length <= 0) {
            return {status: 404, message: "No game with id"}
        }
        if (getCreatorId[0].creator_id === userId) {
            return {status: 403, message: "Cannot mark a game you created as owned"}
        }
        const [insertOwned] = await conn.query(`INSERT INTO owned (game_id, user_id)
                                                VALUES (?,?)`, [gameId, userId]);
        const [removeFromWishlist] = await conn.query(`DELETE FROM wishlist WHERE game_id = ? AND user_id = ?`, [gameId, userId]);
        return {status: 200, message: "Successfully added to own"};
    } finally {
        await conn.release();
    }
}

const removeFromOwn = async (gameId: number, userId: number): Promise<any> => {
    Logger.info(`Adding to own`);
    const conn = await getPool().getConnection();
    const query = `DELETE FROM owned WHERE game_id = ? AND user_id = ? `
    const [result] = await conn.query(query, [gameId, userId]);
    if (result.affectedRows <= 0 ) {
        return 403
    } else {
        return 200
    }
}

const removFromWishlist = async (gameId: number, userId: number): Promise<any> => {
    Logger.info(`Deleting from wishlist`);
    const conn = await getPool().getConnection();
    try {
        const [gameFromWishlist] = await conn.query(`SELECT * FROM wishlist WHERE game_id = ? AND user_id = ?`, [gameId, userId]);
        const isValidGameId = await checkID.gameValidId(gameId);
        if (isValidGameId === null) {
            return {status: 404, message: "No game with id"}
        }
        if (gameFromWishlist.length <= 0) {
            return {status: 403, message: "Cannot unmark a game you do not currently own"};
        }
        await conn.query(`DELETE FROM wishlist WHERE game_id = ? AND user_id = ?`, [gameId, userId]);
        return {status: 200, message: "Successfully removed from wishlist"};
    } finally {
        await conn.release();
    }
}

export {addToOwn, addToWishlist, removeFromOwn, removFromWishlist}