export const typeDefs = `#graphql
    type Game {
        id: ID!,
        title: String!,
        platform: [String!],
        reviews: [Review!]
    }
    type Review {
        id: ID!,
        rating: Int!,
        content: String!,
        author_id: String!,
        game_id: String!,
        game: Game!,
        author: Author!,
    }
    type Author {
        id: ID!,
        name: String!,
        verified: Boolean!,
        password: String!,
        reviews: [Review!]
    }
    type AuthWithToken {
        author: Author,
        token: String
    }
    type Query {
        reviews: [Review],
        review(id:ID!): Review,
        games: [Game],
        game(id:ID!): Game,
        authors: [Author],
        author(id:ID!): Author,
        gamePagination(pageNo: Int!):[Game],
        gameByTitle(title: String!):[Game]
    }
    type Mutation {
        addGame(game: AddGameInput!):Game
        addAuthor(author: AddAuthorInput!):AuthWithToken
        deleteGame(id: ID!): [Game]
        updateGame(id: ID!, data: UpdateGameInput): Game
        addReview(review: AddReviewInput!): Review
    }
    input AddAuthorInput {
        name: String!,
        verified: Boolean!,
        password: String!
    }
    input AddGameInput {
        title:String!,
        platform: [String!]!
    }
    input UpdateGameInput {
        title:String,
        platform: [String!]
    }
    input AddReviewInput {
        rating: Int!,
        content: String!,
        author_id: String!,
        game_id: String!
    }
`