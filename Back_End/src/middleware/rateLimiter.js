import rateLimit from "../config/upstash.js"

const rateLimiter = async (req, res, next) => {

    try{

        const {success} = await rateLimit.limit("my-limit-key")

        if (!success) {
            return res.status(429).json({message: "Too many requests, please try again later."});
        }
    }
    catch (error) {

        console.error("Rate limiter error:", error);
        res.status(500).json({message: "limit server error"});

    }

    next();
}

export default rateLimiter;