import { model, Schema } from "mongoose";

const reviewSchema = new Schema({
    rating: Number,
    content: String,
    author_id: String,
    game_id: String,
})

const ReviewModel = model("review", reviewSchema);
export { ReviewModel }