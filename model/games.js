import { model, Schema } from "mongoose";

const gameSchema = new Schema({
    title: String,
    platform: Array,
    // reviews: Array
})

const GameModel = model("game", gameSchema);
export { GameModel }
