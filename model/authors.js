import { model, Schema } from "mongoose";

const authorSchema = new Schema({
    name: String,
    verified: Boolean,
    password: String,
    email: String
    // reviews: Array
})

const AuthorModel = model("author", authorSchema);
export { AuthorModel }