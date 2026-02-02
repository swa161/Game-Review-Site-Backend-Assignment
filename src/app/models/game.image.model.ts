import {getPool} from "../../config/db"
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";
import * as validId from "../services/checkValidId"

const getImage = async (gameId: number) => {
    Logger.info(`Getting image of game Id ${gameId}`);
    const conn = await getPool().getConnection();

    try {
        const maxIdQuery = `SELECT MAX(id) FROM game`;
        const [maxId] = await conn.query(maxIdQuery);

        if (gameId > Number(maxId[0]['MAX(id)'])) {
            return null;
        }
        const query = `SELECT image_filename FROM game WHERE id = ?`;
        const [result] = await conn.query(query, [gameId]);
        return [result][0];
    } finally {
        await conn.release();
    }


}

const updateImage = async(gameId: number,imageName: string, authUserId: any): Promise<any> => {
    Logger.info(`Uploading image for game: ${gameId}`);
    const conn = await getPool().getConnection();
    try{

        const valid = await validId.gameValidId((gameId));
        if (!valid) {
            return 404
        }
        const checkImageQuery = `SELECT image_filename, creator_id FROM game WHERE id = ?`; // Check current game image, null if no image
        const [gameInfo] = await conn.query(checkImageQuery, [gameId]);
        const currentImage = gameInfo[0].image_filename;
        if (authUserId !== gameInfo[0].creator_id) {
            return 403; // No permission
        }
        const updateQuery = `UPDATE game SET image_filename = ? WHERE id = ?`;
        const result = await conn.query(updateQuery, [imageName, gameId]);
        if (currentImage === null) {
            return 201
        } else {
            return 200
        }
    } finally {
        await conn.release();
    }




}

export {getImage, updateImage};