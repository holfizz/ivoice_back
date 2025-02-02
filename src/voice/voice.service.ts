import { Injectable } from "@nestjs/common";
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
  constructor(private readonly sberService: SberVoiceService) {}

  async generateVoice(text: string, settings: VoiceSettings): Promise<Buffer> {
    try {
      console.log("=== VoiceService: Generating voice ===");
      console.log("Text to synthesize:", text);
      console.log("Voice settings:", settings);

      // Получаем базовый голос от Сбера (без изменения скорости)
      const originalBuffer = await this.sberService.generateVoice(text, settings.voiceId, 1.0);

      // Если скорость = 1, возвращаем оригинальный буфер
      if (settings.speed === 1.0) {
        return originalBuffer;
      }

      // Создаем временные файлы
      const tempInputPath = `/tmp/${uuidv4()}.wav`;
      const tempOutputPath = `/tmp/${uuidv4()}.wav`;

      try {
        // Сохраняем буфер во временный файл
        await writeFile(tempInputPath, originalBuffer);

        // Изменяем скорость с помощью FFmpeg
        await new Promise<void>((resolve, reject) => {
          ffmpeg(tempInputPath)
            .audioFilter(`atempo=${settings.speed}`) // Изменяем скорость
            .toFormat("wav")
            .on("end", () => resolve())
            .on("error", err => reject(err))
            .save(tempOutputPath);
        });

        // Читаем обработанный файл
        const processedBuffer = await fs.promises.readFile(tempOutputPath);

        // Удаляем временные файлы
        await unlink(tempInputPath);
        await unlink(tempOutputPath);

        console.log("Voice generation completed successfully");
        return processedBuffer;
      } catch (error) {
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
