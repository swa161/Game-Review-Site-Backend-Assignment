import {getPool} from "../../config/db"
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";
import * as validId from "./checkValidId"

const userValidId = async (id: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const maxIdQuery = `SELECT MAX(id) FROM user`;
    const [maxId] = await conn.query(maxIdQuery);
    if (id > Number(maxId[0]['MAX(id)'])) {
        await  conn.release();
        return null;
    }
    return true;
}

const gameValidId = async (id: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const maxIdQuery = `SELECT MAX(id) FROM game`;
    const [maxId] = await conn.query(maxIdQuery);
    if (id > Number(maxId[0]['MAX(id)'])) {
        await  conn.release();
        return null;
    }
    return true;
}

export {userValidId, gameValidId}