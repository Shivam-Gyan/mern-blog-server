
import User from "../Schema/User.js";
import ErrorHandler from "../middleware/error.middleware.js";




export const getProfile = async (req, res, next) => {

    const userId = req.user


    try {
        const user = await User.findOne({ "_id": userId })
            .select("-personal_info.password -google_auth -updatedAt -blogs -integrationdetails -integration_token_limit");

        if (!user) {
            return next(new ErrorHandler("User not found", 404))
        }
        return res.status(200).json(user);

    } catch (err) {
        return next(new ErrorHandler(err.message, 404));
    }
}

