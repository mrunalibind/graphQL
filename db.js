import mongoose from 'mongoose';
import {} from 'dotenv/config'

let connection = mongoose.connect(process.env.MongoURL);

export { connection };

