import {getPool} from "../../config/db"
import Logger from "../../config/logger";
import * as validId from "../services/checkValidId"


interface Review {
    user_id: number;
    review: string;
    rating: number;
    timestamp: string;
    reviewerId?: number;
    reviewerFirstName?: string;
    reviewerLastName?: string;
}

const getGameReview = async(gameId: number): Promise<any> => {
    Logger.info(`Getting review for game ${gameId}`);
    const conn = await getPool().getConnection();
    const users: Record<number, { firstName: string; lastName: string }> = {};
    try {
        const valid = await validId.gameValidId(gameId);
        if (!valid) {
            return 404
        }
        const reviewInfoquery = `SELECT user_id, review, rating, timestamp FROM game_review WHERE game_id = ?`;
        const userNameQuery = `SELECT id, first_name, last_name FROM user WHERE id IN (?)`;
        const [reviewInfo] = await conn.query(reviewInfoquery, [gameId]);
        const userIds = reviewInfo.map((review: any) => review.user_id);
        const [userNames]: any = await conn.query(userNameQuery, [userIds]);

        for (const u of userNames ) {
            users[u.id] = {firstName: u.first_name, lastName: u.last_name};
        }
        for (const review of reviewInfo) {
            const user = users[review.user_id]
            if (user) {
                review.reviewerId = review.user_id;
                review.reviewerFirstName = user.firstName;
                review.reviewerLastName = user.lastName;
                delete review.user_id; // Optional: remove original user_id field
            }
        }
        const reorderedReviews = reviewInfo.map((review: Review) => ({
            reviewerId: review.reviewerId,
            reviewerFirstName: review.reviewerFirstName,
            reviewerLastName: review.reviewerLastName,
            review: review.review,
            rating: review.rating ?? 0,
            timestamp: review.timestamp
        }));

        const sortedReviews = reorderedReviews.sort((a: Review, b: Review) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);

            return dateB.getTime() - dateA.getTime();  // Descending order (most recent first)
        });
        return reorderedReviews;
    } finally {
        await conn.release();
    }
}


const insertReview = async (authUserId: number, gameId: number ,rating: number, review: string): Promise<any> => {
    Logger.info(`Creating review for game ${gameId}`);
    const conn = await getPool().getConnection();
    const [gameIdRows] = await conn.query(`SELECT id FROM game WHERE id = ?`, [gameId]);
    if (gameIdRows.length === 0) {
        return {
            status: 400,
            message: "No game found.",
        }; // Bad request game id does not exsit
    }
    const [sameUserrows] = await conn.query(`SELECT creator_id FROM game WHERE id = ?`, [gameId]);
    if (authUserId === sameUserrows[0].creator_id) {
        return {
            status: 403,
            message: "Cannot post review for own games"
        };
    }

    const [alreadyPost] = await conn.query(`SELECT id FROM game_review WHERE user_id = ? AND game_id = ?`, [authUserId, gameId]);
    if (alreadyPost.length > 0) {
        return {
            status: 403,
            message: "Already post a review for this game"
        };
    }
    try {
        const [result] = await conn.query(`INSERT INTO game_review (game_id , user_id , rating , review , timestamp )
         VALUES (?, ?, ?, ?, NOW())`, [gameId, authUserId, rating, review]);
        return {
            status: 201,
            message: "Successfully post a review for this game"
        };
    } finally {
        await conn.release();
    }

}


export {getGameReview, insertReview}