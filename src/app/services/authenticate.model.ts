import {getPool} from "../../config/db";
import exp from "node:constants";
import Logger from "../../config/logger";
/**
 *  Changed token type from stirng to =>  string | stirng[]
 */
const getAuthenticatedUser = async (token: string | string[]): Promise<any> => {
    if (!token) { return null}
    const conn = await getPool().getConnection();
    const query = `SELECT id FROM user where auth_token = ?;`;
    const [result] = await conn.query(query, [token]);
    try {
        if (result.length === 0) {
            return null;
        } else {
            return result[0].id;
        }
    } finally {
        await conn.release();
    }
}

const getToken = async (userId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const [result] = await conn.query(`SELECT auth_token FROM user WHERE id = ?`, [userId]);
    return result[0].auth_token;
}

export {getAuthenticatedUser, getToken}