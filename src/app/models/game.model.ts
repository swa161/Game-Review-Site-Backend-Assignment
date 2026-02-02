import {getPool} from "../../config/db"
import Logger from "../../config/logger";
import {platform} from "node:os";

const getAllgenres = async(): Promise<any> => {
    Logger.info(`Getting all genres`);
    const conn = await getPool().getConnection();
    const query = `SELECT * FROM genre`
    const [results] = await conn.query(query);
    await conn.release();
    return results;
}

const getAllplatform = async(): Promise<any> => {
    Logger.info(`Getting all platform`);
    const conn = await getPool().getConnection();
    const query = `SELECT * FROM platform`
    const [results] = await conn.query(query);
    await conn.release();
    return results;
}

const getMaxPlatformId = async(): Promise<any> => {
    const conn = await getPool().getConnection();
    const query = `SELECT MAX(id) AS max_id FROM platform`;
    const [results] = await conn.query(query);
    return Number(results[0].max_id);
}

const getMaxGameId = async(): Promise<number[]> => {
    const conn = await getPool().getConnection();
    const query = `SELECT id FROM game`;
    const [results] = await conn.query(query);
    const ids = results.map((row: { id: number }) => Number(row.id));
    return ids;
}

const getGameById = async (gameID: number): Promise<any> => {
    Logger.info(`Getting game ${gameID}`);
    const conn = await getPool().getConnection();
    const [wishListsCount] = await conn.query(`SELECT * FROM wishlist WHERE game_id = ?`, [gameID]);
    const [numberOfOwner] = await conn.query(`SELECT * FROM owned WHERE game_id = ?`, [gameID]);
    const [platFormId] = await conn.query(`SELECT platform_id FROM game_platforms WHERE game_id = ?`, [gameID]);
    const [gameInfo] = await conn.query(`SELECT id, title, creation_date, description, creator_id, genre_id, price FROM game WHERE id = ? `, [gameID]);
    const [creatorName] = await conn.query(`SELECT first_name, last_name FROM user WHERE id = ?`, [gameInfo[0].creator_id])
    const [ratings] = await conn.query(`SELECT rating FROM game_review WHERE game_id = ?`, [gameID])
    let total = 0
    for (const r of ratings) {
        total += parseInt(r.rating, 10);
    }
    const platformIdArray: number[] = []
    for (const id of platFormId) {
        platformIdArray.push(id.platform_id);
    }
    let averageRating = total / ratings.length;
    if (isNaN(averageRating)) { // Newly added game does not have rating yet, averageRating will be NaN.
        averageRating = 0;
    }
    return {
        gameId: gameInfo[0].id,
        title: gameInfo[0].title,
        description: gameInfo[0].description,
        genreId: gameInfo[0].genre_id,
        price: gameInfo[0].price,
        creationDate: gameInfo[0].creation_date,
        creatorId: gameInfo[0].creator_id,
        creatorFirstName: creatorName[0].first_name,
        creatorLastName: creatorName[0].last_name,
        rating: averageRating,
        platformIds: platformIdArray,
        numberOfWishlists: wishListsCount.length,
        numberOfOwners: numberOfOwner.length
    };
}

interface Creator {
    id: number;
    first_name: string;
    last_name: string;
}

const getAllGames = async(): Promise<any> => {
    Logger.info(`Getting all games`);

    const conn = await getPool().getConnection();
    const [gameInfo] = await conn.query(`SELECT id, title, creation_date, description, creator_id, genre_id, price FROM game ORDER BY creation_date ASC`);
    const gameIds = gameInfo.map((game: any) => game.id);
    const [creators] = await conn.query( `SELECT id, first_name, last_name FROM user WHERE id IN (?)`,
        [gameInfo.map((g:any) => g.creator_id)]
    );
    const [ratings] = await conn.query(`SELECT AVG(rating) AS averageRating, game_id FROM game_review WHERE game_id IN (?) GROUP BY game_id`, [gameIds]);
    const [reviewerIds] = await conn.query(`SELECT game_id, GROUP_CONCAT(user_id) AS user_ids FROM game_review GROUP BY game_id`);
    const [platforms] = await conn.query( `SELECT game_id, platform_id FROM game_platforms WHERE game_id IN (?)`, [gameIds]);
    const [ownedBy] = await conn.query(`SELECT game_id, GROUP_CONCAT(user_id) AS user_ids FROM owned GROUP BY game_id`);

    const [wishlistedBy] = await conn.query(`SELECT game_id, GROUP_CONCAT(user_id) AS user_ids FROM wishlist GROUP BY game_id`)
    const creatorMap = new Map<number, Creator>(creators.map((c:any) => [c.id, c]));
    const ratingMap = new Map(ratings.map((r: any) => [r.game_id, r.averageRating || 0]));
    const reviewerMap = new Map();
    const ownedMap = new Map();
    const wishListMap = new Map();

    const platformMap = new Map();
    platforms.forEach((p: any) => {
        if (!platformMap.has(p.game_id)) {
            platformMap.set(p.game_id, []);
        }
        platformMap.get(p.game_id).push(p.platform_id);
    });
    reviewerIds.forEach((r: any) => {
        const userIdList = r.user_ids ? r.user_ids.split(',').map(Number) : [];
        reviewerMap.set(r.game_id, userIdList);
    });
    ownedBy.forEach((o: any) => {
       const ownerList =  o.user_ids ? o.user_ids.split(',').map(Number) : [];
       ownedMap.set(o.game_id, ownerList);
    });
    wishlistedBy.forEach((w: any) => {
        const wishlistList = w.user_ids ? w.user_ids.split(',').map(Number) : [];
        wishListMap.set(w.game_id, wishlistList);
    });
    const formattedGames = gameInfo.map((game: any) => ({
        gameId: game.id,
        title: game.title,
        genreId: game.genre_id,
        creationDate: game.creation_date,
        description: game.description,
        creatorId: game.creator_id,
        price: game.price,
        creatorFirstName: creatorMap.get(game.creator_id)?.first_name || "Unknown",
        creatorLastName: creatorMap.get(game.creator_id)?.last_name || "Unknown",
        rating: ratingMap.get(game.id) || 0,
        platformIds: platformMap.get(game.id) || [],
        reviewerIds: reviewerMap.get(game.id) || [],
        ownedBy: ownedMap.get(game.id) || [],
        wishlistUsers: wishListMap.get(game.id) || [],
    }));

    await conn.release();
    return {games: formattedGames, count: formattedGames.length};
}

const addOneGame = async(title: string, decription: string, genreId: number, price:number, creatorId:number,
    platforms: number[]): Promise<any> => {

    const conn = await getPool().getConnection();
    try {
        const query = `INSERT INTO game (title, description, creation_date, creator_id, genre_id, price) VALUES (?,?,NOW(),?,?,?)`
        const [gameResult] = await conn.query(query, [title, decription, creatorId, genreId, price]);
        const gameID = gameResult.insertId;
        if (platforms.length > 0) {
            const platformValues = platforms.map(p => [gameID, p]);
            await conn.query(
                `INSERT INTO game_platforms (game_id, platform_id) VALUES ?`,
                [platformValues]
            );
        }
        return {gameId: gameID};
    } finally {
        await conn.release();
    }
}

const patchGame = async(gameId: number, loggedInUser: number, title?: string, description?: string,
                        genreId?: number, price?: number, platforms?: number[]): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        const [creatorId] = await conn.query(`SELECT creator_id FROM game WHERE id = ?`, [gameId]);
        const [query] = await conn.query(`SELECT title FROM game`);
        const gameTitles = query.map((row: { title: string }) => row.title);
        if (creatorId[0].creator_id !== loggedInUser) {
            return {
                status: 403,
                message: "Only the creator of the game may modify the content."
            }
        }
        if (gameTitles.includes(title)) {
            return {
                status: 403,
                message: "Game title already exists"
            }
        }
        const updates: any[] = [];
        const values: any[] = [];
        if (title) {
            updates.push("title = ?");
            values.push(title);
        }
        if (description) {
            updates.push("description = ?")
            values.push(description);
        }
        if (genreId) {
            updates.push("genre_id = ?");
            values.push(genreId);
        }
        if (price) {
            updates.push("price = ?")
            values.push(price);
        }
        if (platforms) {
            const removeFromPlatfoms = await conn.query(`DELETE FROM game_platforms WHERE game_id = ?`, [gameId]);
            for (const newPlatformID of platforms) {
                await conn.query(`INSERT INTO game_platforms (game_id, platform_id) VALUES (?, ?)`, [gameId, newPlatformID]);
            }
        }
        const updatedGame = await conn.query(`UPDATE game SET ${updates.join(', ')} WHERE id = ${gameId}`, values)
        return {
            status: 200,
            message: "Successfully updated game"
        }

    } finally {
        await conn.release();
    }
}

const removeGame = async(gameId: number, userId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    try {
        const [gameReviews] = await conn.query(`SELECT review FROM game_review WHERE game_id = ?`, [gameId]);
        const [creator] = await conn.query(`SELECT creator_id FROM game WHERE id = ?`, [gameId]);
        const gameCreator = creator[0].creator_id;
        Logger.info(creator[0].creator_id);
        Logger.info(userId);
        Logger.info(JSON.stringify(gameReviews));
        if (gameCreator !== userId) {
            return {
                status: 403,
                message: "Only the creator of this game is allowed to remove it."
            }
        }
        if (gameReviews.length > 0) {
            return {
                status: 403,
                message: "Cannot delete game with one or more reviews."
            }
        }
        await conn.query(`DELETE FROM game_platforms WHERE game_id = ?`, [gameId]);
        await conn.query(`DELETE FROM owned WHERE game_id = ?`, [gameId]);
        await conn.query(`DELETE FROM wishlist WHERE game_id = ?`, [gameId]);
        await conn.query(`DELETE FROM game WHERE id = ?`, [gameId]);
        return {
            status: 200,
            message: "Successfully removed game"
        }
    } finally {
        await conn.release();
    }
}

export {getAllgenres, getAllplatform, getAllGames, getMaxPlatformId, getMaxGameId, getGameById, addOneGame, patchGame, removeGame};