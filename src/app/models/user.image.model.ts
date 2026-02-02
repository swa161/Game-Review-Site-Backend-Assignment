import {getPool} from "../../config/db"
import Logger from "../../config/logger";
import {ResultSetHeader} from "mysql2";
import * as validId from "../services/checkValidId"



const deleteImg = async (id: number, authUserId: any): Promise<any> => {
    Logger.info(`Deleting user ${id}'s image`);
    const conn = await getPool().getConnection();
    const valid = await validId.userValidId(id);
    if (!valid) {
        await  conn.release();
        return null;
    } else {
        if (authUserId === id) {
            const query = `UPDATE user SET image_filename = null WHERE id = ?`;
            const [result] = await conn.query(query, [id]);
            await conn.release();
            return result;
        } else {
            return `Forbidden`;
        }
    }
}

const getImg = async (id: number, authUserId: any): Promise<any> => {
    Logger.info(`Get user ${id}'s Image`);
    const conn = await getPool().getConnection();
    const valid = await validId.userValidId(id);
    if (!valid) {
        await  conn.release();
        return null;
    } else {
        const query = `SELECT image_filename FROM user WHERE id = ? `;
        const [result] = await conn.query(query, [id]);
        await conn.release();
        return result;
    }
}

const updateImg = async (id: number, authUserId: any, imgName: string): Promise<any> => {
    Logger.info(`Update user ${id}'s Image`);
    const conn = await getPool().getConnection();
    try {
        const valid = await validId.userValidId(id);
        if (!valid) {
            return null;
        }

        const getImgQuery = `SELECT image_filename FROM user WHERE id = ?`;
        const [imgResult] = await conn.query(getImgQuery, [id]);

        if (authUserId !== id) {
            return { 'code': 403 };
        }

        const query = `UPDATE user SET image_filename = ? WHERE id = ? `;
        const [result] = await conn.query(query, [imgName, id]);

        return {
            'code': imgResult[0].image_filename === null ? 201 : 200,
        };
    } finally {
        await conn.release();
    }
}

export {deleteImg, getImg, updateImg};