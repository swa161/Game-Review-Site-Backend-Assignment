import {Request, Response} from "express";
import Logger from '../../config/logger';
import * as user from "../models/user.model";
import * as schema from "../resources/schemas.json"
import {validate} from "../services/validator"
import * as authenticate from "../services/authenticate.model";
import * as checkPassword from "../services/passwords"


const register = async (req: Request, res: Response): Promise<void> => {
    Logger.http (`POST Create user with info ${JSON.stringify(req.body)}`);
    const validation = await validate(
        schema.user_register,
        req.body);
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }
    const {firstName, lastName, email, password} = req.body;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        res.statusMessage = `Invalid email address format: ${email}`;
        res.status(400).send();
        return;
    }
    try {
        const result = await user.insert(firstName, lastName, email, password);
        res.status(201).json({
            "userId": result
        });
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    Logger.http(`POST Login with info ${JSON.stringify(req.body)}`);
    const validation = await validate(
        schema.user_login,
        req.body
    )
    if (validation !== true) {
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }
    try {
        const inputPassword = req.body.password;
        const inputEmail = req.body.email;
        const result = await user.login(inputEmail, inputPassword);
        if (result.status === 401) {
            res.status(401).send({message: result.message});
        }
        if (result.status === 404) {
            res.status(404).send({message: result.message});
        }
        if (result.status === 200) {
            res.status(200).send({
                userId: result.userId,
                token: result.token,
                message: result.message
            })
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
        ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    try {
        const result = await user.logout(token);
        if (result.status === 200) {
            res.status(200).send({message: result.message})
        } else if (result.status === 401) {
            res.status(401).send({message: result.message});
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    const token = Array.isArray(req.headers['x-authorization']) // Check if the x-authorization is an array
    ? req.headers['x-authorization'][0]
    : req.headers['x-authorization'];
    const authUserId =  await authenticate.getAuthenticatedUser(token)
    const id = Number(req.params.id);
    if (!id) {
        res.statusMessage = "Id can not be empty";
        res.status(400).send();
        return;
    }
    try {
        const result = await user.getOneUser(id, authUserId);
        if (!result) {
            res.statusMessage = "No user found";
            res.status(404).send();
        } else {
            res.status(200).json(result);
        }
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

const update = async (req: Request, res: Response): Promise<void> => {
    const validation = await validate(schema.user_edit, req.body)
    const token = Array.isArray(req.headers['x-authorization']) ? req.headers['x-authorization'][0]
        : req.headers['x-authorization'];
    const userByToken = await authenticate.getAuthenticatedUser(token);
    const id = Number(req.params.id);
    const {email, firstName, lastName, password, currentPassword} = req.body;


    if (id !== userByToken) {
        res.status(403).send("Can not edit another user's information");
        return;
    }
    if (isNaN(id)) { // invalid id
        res.status(400).send("Invalid user ID");
        return;
    }
    const currentUserToken = await user.getUserToken(id);
    if (currentUserToken !== token) {
        res.status(401).send("Unauthorized");
        return;
    }
    if (validation !== true) { // Bad format
        res.statusMessage = `Bad Request: ${validation.toString()}`
        res.status(400).send();
        return;
    }
    if (password || currentPassword) {
        if (!password || !currentPassword) {
            res.status(400).send("Both password and current password must exist when editing password");
            return;
        }
        if (password === currentPassword) {
            res.status(403).send("New password and old password cannot be the same");
            return;
        }
        const currentHashedPass = await user.getHashedCurrentPassword(id);
        const isValidCurrentPassword = await checkPassword.compare(currentPassword, currentHashedPass);
        if (isValidCurrentPassword === false) {
            res.status(401).send("Invalid currentPassword");
            return;
        }
    }
    if (email) { // invalid email format or duplicate
        const emailAlreadyExist = await user.checkExistEmail(email);
        if (emailAlreadyExist) {
            res.status(403).send("Email already exists");
            return;
        } else {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                res.statusMessage = `Invalid email address format: ${email}`;
                res.status(400).send();
                return;
            }
        }
    }
    try {
        const result = await user.patchUser(id, email, firstName, lastName, password);
        res.status(200).send(result);
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
    }
}

export {register, login, logout, view, update};