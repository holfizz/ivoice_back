import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as express from "express";
import { graphqlUploadExpress } from "graphql-upload-ts";
import { join } from "path";
import { AppModule } from "./app.module";
import logger from "./helpers/logger";
import { FileTooLargeExceptionFilter } from "./PayloadTooLargeError";
const cookieParser = require("cookie-parser");

const start = async () => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const PORT = process.env.PORT || 6060;

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: ["http://localhost:3000", "https://yourmuse.shop"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    credentials: true,
  });

  app.useGlobalFilters(new FileTooLargeExceptionFilter());
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  app.use(
    graphqlUploadExpress({
      maxFileSize: 100 * 1024 * 1024,
      maxFiles: 1,
    }),
  );

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });
  app.use("/uploads", express.static(join(process.cwd(), "uploads")));
  app.getHttpAdapter().getInstance().disable("x-powered-by");

  await app.listen(PORT, "0.0.0.0", () => {
    logger.log(`Server started on PORT ${PORT}`);
  });
};

start();
