import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from "./schema.js";
import { connection } from './db.js';
import { GameModel } from './model/games.js';
import { ReviewModel } from './model/reviews.js';
import { AuthorModel } from './model/authors.js';
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import { } from 'dotenv/config'
import express from "express";
import cors from "cors";
import redis from "redis";

const client = redis.createClient({
    // host: 'redis-17853.c305.ap-south-1-1.ec2.cloud.redislabs.com',
    // port: 17853,
    // auth_pass: 'Gqg72jtv3tNzvk1iVKlYsgDjFFrDrqwu',
    url: process.env.redisCloud
})

client.connect();

client.on('connect', () => {
    console.log('Connected to Redis Cloud');
});

client.on('error', (err) => {
    console.error('Redis Cloud Error:', err);
});

const app = express();
app.use(cors());

const resolvers = {
    Query: {
        async games() {
            try {
                return await GameModel.find();
            } catch (error) {
                throw new Error(error);
            }
        },
        async reviews() {
            try {
                return await ReviewModel.find();
            } catch (error) {
                throw new Error(error);
            }
        },

        // Only logged in and verfied: true authors can access these route, 
        // for these pass token in header which you got while creating author
        async authors(_, args, context) {

            try {
                if (!context.user) throw new GraphQLError("you must be logged in to query this schema", {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
                return await AuthorModel.find();
            } catch (error) {
                throw new Error(error);
            }
        },
        async review(_, { id }) {
            try {
                return await ReviewModel.findOne({ _id: id });
            } catch (error) {
                throw new Error(error);
            }
        },
        async game(_, { id }) {
            try {
                return await GameModel.findOne({ _id: id });
            } catch (error) {
                throw new Error(error);
            }
        },
        async author(_, { id }) {
            try {
                return await AuthorModel.findOne({ _id: id });
            } catch (error) {
                throw new Error(error);
            }
        },
        async gamePagination(_, args) {
            try {
                const limit = 2;
                let games = await GameModel.find();
                let totalPage = Math.ceil(games.length / limit);
                if (args.pageNo > totalPage) throw new Error("More Data Not exist");
                const offset = (args.pageNo - 1) * limit || 0;
                return await GameModel.find().skip(offset).limit(limit);
            } catch (error) {
                throw new Error(error);
            }
        },
        async gameByTitle(_, args) {
            try {
                const regex = new RegExp(args.title, 'i'); // Case-insensitive search
                return await GameModel.find({ title: { $regex: regex } });
            } catch (error) {
                throw new Error(error);
            }
        }
    },
    Game: {
        async reviews(parent) {
            return await ReviewModel.find({ game_id: parent.id });
        }
    },
    Author: {
        async reviews(parent) {
            return await ReviewModel.find({ author_id: parent.id });
        }
    },
    Review: {
        async author(parent) {
            return await ReviewModel.find({ id: parent.author_id });
        },
        async game(parent) {
            return await ReviewModel.find({ id: parent.game_id });
        }
    },
    Mutation: {
        async deleteGame(_, { id }) {
            try {
                await GameModel.deleteOne({ _id: id });
                return await GameModel.find();
            } catch (error) {
                throw new Error(error);
            }
        },
        async addGame(_, args) {
            try {
                let game = await GameModel.create(args.game);
                return await GameModel.findOne({ _id: game._id })
            } catch (error) {
                throw new Error(error);
            }
        },
        async addAuthor(_, args) {
            try {
                const hashedPassword = await new Promise((resolve, reject) => {
                    bcrypt.hash(args.author.password, 5, (err, hash) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(hash);
                        }
                    });
                });
                args.author.password = hashedPassword;

                const author = new AuthorModel(args.author);
                await author.save();

                // Create a unique token for the author
                const token = jwt.sign({ authorId: author._id }, process.env.secretKey);

                // Storing token in redis with expiry 10 min
                client.set("token", token, "EX", 60 * 10);

                // Retrieving token from Redis
                let storeToken = await client.get("token");
                console.log("Got successfully from redis", storeToken);

                await client.disconnect();

                return { author, token };
            } catch (error) {
                throw new Error(error);
            }

        },
        async updateGame(_, args) {
            try {
                await GameModel.updateOne({ _id: args.id }, { $set: args.data });
                return await GameModel.findOne({ _id: args.id });
            } catch (error) {
                throw new Error(error);
            }
        },

        // authors should logged in to access to these route and 
        // only verfied:true authors can add reviews
        async addReview(_, args, context) {
            try {
                if (!context.user) throw new GraphQLError("you must be logged in to query this schema", {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                    },
                });
                let getToken=await client.get("token");
                let user = jwt.verify(getToken, process.env.secretKey);
                args.review.author_id = user.authorId;
                let review = await ReviewModel.create(args.review);
                return await ReviewModel.findOne({ _id: review._id })
            } catch (error) {
                throw new Error(error);
            }
        }

    }
}

// server setup
const server = new ApolloServer({

    // typeDefs: used to define Schema
    typeDefs,

    // resolvers: logic of retrieval query 
    resolvers,
})

async function startServer() {
    await connection;
    console.log("Connected to mongoDB");
    const { url } = await startStandaloneServer(server, {
        context: async ({ req }) => {
            // Get the user token from the headers
            // Authentication
            const token = req.headers.authorization || '';

            // Validate the token and extract the user information
            let user = null;
            try {
                if (token) {
                    user = jwt.verify(token, process.env.secretKey);

                    // Authorization
                    let verifiedAuth = await AuthorModel.findOne({ _id: user.authorId })

                    if (verifiedAuth.verified === false)
                        throw new GraphQLError('Not verfied Author', {
                            extensions: {
                                code: 'UNAUTHENTICATED',
                                http: { status: 401 },
                            },
                        });
                }
            } catch (error) {
                throw new GraphQLError('Invalid token', {
                    extensions: {
                        code: 'UNAUTHENTICATED',
                        http: { status: 401 },
                    },
                });
            }
            return { user };
        },
        listen: { port: process.env.PORT },

    });
    console.log('Server is running on', url);
}
startServer();