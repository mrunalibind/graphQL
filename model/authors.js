import { model, Schema } from "mongoose";

const authorSchema = new Schema({
    name: String,
    verified: Boolean,
    password: String,
    email: String
},{
    versionKey: false
})

const AuthorModel = model("author", authorSchema);
export { AuthorModel }