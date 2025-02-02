import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as path from "path";
import { AuthModule } from "./auth/auth.module";
import { OrderModule } from "./order/order.module";
import { PrismaService } from "./prisma.service";
import { TelegramModule } from "./telegram/telegram.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: "src/schema.gql",
      installSubscriptionHandlers: true,
      sortSchema: true,
      useGlobalPrefix: true,
      subscriptions: {
        "graphql-ws": true,
        "subscriptions-transport-ws": true,
      },
      playground:
        process.env.NODE_ENV !== "production"
          ? {
              settings: {
                "request.credentials": "include",
              },
            }
          : false,
      context: ({ req, res }) => ({ req, res }),
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, "..", "static"),
      serveRoot: "/api",
    }),
    OrderModule,
    TelegramModule,
    VoiceModule,
    AuthModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
