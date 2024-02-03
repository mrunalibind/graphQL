import { model, Schema } from "mongoose";

const gameSchema = new Schema({
    title: String,
    platform: Array,
    // reviews: Array
},{
    versionKey: false
})

const GameModel = model("game", gameSchema);
export { GameModel }
