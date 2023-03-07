import { DB, Tigris as TigrisData } from "@tigrisdata/core";
import { AutoBaldConfig, Stream, User } from '../../types';
import { log, LogLevel } from '../../log';

export abstract class Tigris {

    private static tigrisClient: TigrisData;
    private static tigrisDB: DB;

    public static async init(config: AutoBaldConfig) {
        this.tigrisClient = new TigrisData({
            clientId: config.tigrisClientId,
            clientSecret: config.tigrisClientSecret,
            projectName: config.tigrisProjectName,
            branch: "main"
        });

        this.tigrisDB = await this.tigrisClient.getDatabase()
        await this.tigrisDB.initializeBranch();
        // register schemas
        await this.tigrisClient.registerSchemas([User]);
    }

    public static async getUser(login: string): Promise<User | undefined> {
        let user: User | undefined

        try {
            const userCollection = await this.tigrisDB.getCollection<User>(User);

            user = await userCollection.findOne({
                filter: {
                    login
                }
            })
        }
        catch (err) {
            log(LogLevel.Error, err)
        }

        return user
    }

    public static async saveUser(user: User): Promise<User | undefined> {
        try {
            const userCollection = await this.tigrisDB.getCollection<User>(User);
            user = await userCollection.insertOrReplaceOne(user);
        }
        catch (err) {
            log(LogLevel.Error, err)
        }

        return user
    }
}