import {getPool} from "../../config/db";
import Logger from "../../config/logger";
import * as hashedPassword from "../services/passwords"
import * as token from "../services/token";

const insert = async(firstname: string, lastname: string, email: string, password: string): Promise<any> => {
    Logger.info(`Inserting user ${firstname} ${lastname} into database `);
    const conn = await getPool().getConnection();
    const hashedPass = await hashedPassword.hash(password);
    const query = `INSERT into user (first_name, last_name, email, password) values (?,?,?,?)`;
    const [result] = await conn.query(query, [firstname, lastname, email, hashedPass]);
    await  conn.release();
    return result.insertId;
}

const getOneUser = async (id: number, authUserId: number): Promise<any> => {
    Logger.info(`Getting user ${id}'s info from database `);
    const conn = await getPool().getConnection();
    const maxIdQuery = `SELECT MAX(id) FROM user`;
    const [maxId] = await conn.query(maxIdQuery);
    if (id > Number(maxId[0]['MAX(id)'])) {
        await  conn.release();
        return null;
    } else {
        const query = `SELECT first_name, last_name, email FROM user WHERE id = ?`;
        const [rows] = await conn.query(query, id);
        await  conn.release();
        const user = rows[0]
        if (authUserId === id) {
            return {
                "firstName": user.first_name,
                "lastName": user.last_name,
                "email": user.email,
            };
        } else {
            return {
                "firstName": user.first_name,
                "lastName": user.last_name,
            }
        }
    }
}

const login = async (email: string, inputPassword: string): Promise<any> => {
    Logger.info(`Login user with the email ${email}`);
    const conn = await getPool().getConnection();
    const [queryGetPass] = await conn.query( `SELECT password from user WHERE email = ?`, [email]);
    if (!queryGetPass) {
        return {
            status: 404,
            message: "Email Not Found"
        }
    }

    const matchedPassword = await hashedPassword.compare(inputPassword, queryGetPass[0].password);
    Logger.info(queryGetPass[0].password);
    try {
        if (!matchedPassword) {
            return {
                status: 401,
                message: "Invalid email or password"
            }
        } else {
            const genToken = await token.generateToken();
            const [updateToken] = await conn.query(`UPDATE user SET auth_token = ? where email = ?`, [genToken, email]);
            const [userInfo] = await conn.query(`SELECT id, auth_token FROM user WHERE email = ?`, [email]);
            return {
                status: 200,
                message: "Logged in successfully",
                userId: userInfo[0].id,
                token: userInfo[0].auth_token
            }
        }
    } finally {
        await conn.release();
    }

}

const logout = async (authToken: string): Promise<any> => {
    Logger.info(`Logout user`);
    const conn = await getPool().getConnection();
    const [getUserByToken] = await conn.query(`SELECT id FROM user WHERE auth_token = ?`, [authToken]);
    try {
        if (getUserByToken.length <= 0) {
            return {
                status: 401,
                message: "Unauthorized. Cannot log out if you are not authenticated"
            }
        } else {
            const removeToken = await conn.query(`UPDATE user SET auth_token = null where id = ?`, [getUserByToken[0].id]);
            return {
                status: 200,
                message: "Logged out successfully",
            }
        }
    } finally {
        await conn.release();
    }
}

const patchUser = async(
    userId: number,
    email?: string,
    firstName?: string,
    lastName?: string,
    newPassword?: string): Promise<any> => {
    Logger.info(`Patching user ${userId}`);
    const updates: string[] = [];
    const values: string[] = [];
    const conn = await getPool().getConnection();

    try {
        if (email) {
            updates.push(`email = ?`);
            values.push(email);
        }
        if (firstName) {
            updates.push(`first_name = ?`);
            values.push(firstName);
        }
        if (lastName) {
            updates.push(`last_name = ?`);
            values.push(lastName);
        }
        if (newPassword) {
            const hashedPass = await hashedPassword.hash(newPassword);
            Logger.info(hashedPass);
            updates.push(`password = ?`);
            values.push(hashedPass);
        }
        const [result] = await conn.query(`UPDATE user SET ${updates.join(",")} WHERE id = ${userId}`, values);
        return result;
    } finally {
        await conn.release();
    }
}

const checkExistEmail = async (email: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const [checkEmail] = await conn.query(`SELECT COUNT(*) AS count FROM user WHERE email = ?`, [email]);
    await conn.release();
    return checkEmail[0].count > 0;
}

const getHashedCurrentPassword = async(userId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const [query] = await conn.query(`SELECT password FROM user WHERE id=?`, [userId]);
    await conn.release();
    Logger.info(query[0].password);
    return query[0].password;
}

const getUserToken = async(userId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const [userToken] = await conn.query(`SELECT auth_token FROM user WHERE id = ?`, [userId]);
    await conn.release();
    return userToken[0].auth_token;
}


export {insert, getOneUser, patchUser, login, logout, checkExistEmail, getHashedCurrentPassword, getUserToken};