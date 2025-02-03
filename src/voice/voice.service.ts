import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { VoiceSettings } from "@prisma/client";
import * as ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import { SberVoiceService } from "./sber.service";

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class VoiceService {
  private ffmpegPath: string;

  constructor(
    private readonly sberService: SberVoiceService,
    private readonly configService: ConfigService,
  ) {
    // Устанавливаем путь к ffmpeg при инициализации сервиса
    this.ffmpegPath = this.configService.get<string>("FFMPEG_PATH") || "/usr/bin/ffmpeg";
    ffmpeg.setFfmpegPath(this.ffmpegPath);
  }

  async generateVoice(text: string, settings: VoiceSettings): Promise<Buffer> {
    try {
      console.log("=== VoiceService: Generating voice ===");
      console.log("Text to synthesize:", text);
      console.log("Voice settings:", settings);
      console.log("FFmpeg path:", this.ffmpegPath);

      // Получаем базовый голос от Сбера (без изменения скорости)
      const originalBuffer = await this.sberService.generateVoice(text, settings.voiceId, 1.0);

      // Если скорость = 1, возвращаем оригинальный буфер
      if (settings.speed === 1.0) {
        return originalBuffer;
      }

      // Создаем временные файлы с абсолютными путями
      const tempDir = "/tmp";
      const tempInputPath = `${tempDir}/${uuidv4()}.wav`;
      const tempOutputPath = `${tempDir}/${uuidv4()}.wav`;

      try {
        // Сохраняем буфер во временный файл
        await writeFile(tempInputPath, originalBuffer);
        console.log("Temporary input file created:", tempInputPath);

        // Изменяем скорость с помощью FFmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempInputPath)
            .audioFilter(`atempo=${settings.speed}`)
            .toFormat("wav")
            .on("start", commandLine => {
              console.log("FFmpeg command:", commandLine);
            })
            .on("error", err => {
              console.error("FFmpeg error:", err);
              reject(err);
            })
            .on("end", () => {
              console.log("FFmpeg processing finished");
              resolve();
            })
            .save(tempOutputPath);
        });

        // Читаем обработанный файл
        const processedBuffer = await fs.promises.readFile(tempOutputPath);
        console.log("Processed file read successfully");

        // Удаляем временные файлы
        await unlink(tempInputPath);
        await unlink(tempOutputPath);
        console.log("Temporary files cleaned up");

        return processedBuffer;
      } catch (error) {
        console.error("Error during FFmpeg processing:", error);
        // В случае ошибки убеждаемся, что временные файлы удалены
        try {
          await unlink(tempInputPath).catch(() => {});
          await unlink(tempOutputPath).catch(() => {});
        } catch {}
        throw error;
      }
    } catch (error) {
      console.error("Error in generateVoice:", error);
      throw error;
    }
  }
}
