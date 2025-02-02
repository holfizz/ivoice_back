import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as https from "https";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class SberVoiceService {
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;

  constructor(private configService: ConfigService) {}

  private async getAccessToken(): Promise<string> {
    // Если у нас уже есть действующий токен, возвращаем его
    if (this.accessToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
      return this.accessToken;
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    try {
      // Запрос на получение access token
      const response = await axios.post("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", "scope=SALUTE_SPEECH_PERS", {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          RqUID: uuidv4(),
          // Используем base64-encoded ключ для авторизации
          Authorization: `Basic MTEyNTBiOTItYWQxZi00NDNjLWJhN2QtNDZlNTQxOTgwMDI2OjA2ODhiMjBiLTA2ZDktNGNiNy05YzU5LTc3OTgwMjViOTA3Zg==`,
        },
        httpsAgent,
      });

      console.log("", response.data);
      // Сохраняем полученный токен
      this.accessToken = response.data.access_token;
      // Токен действителен 30 минут
      this.tokenExpiration = new Date(Date.now() + 30 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      if (error.response) {
        console.error("Auth Error Response:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });
      }
      throw error;
    }
  }

  async synthesize(text: string, voice: string = "Nec_24000"): Promise<Buffer> {
    try {
      // Получаем актуальный access token
      const token = await this.getAccessToken();

      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      // Отправляем текст как plain text
      const response = await axios.post(
        "https://smartspeech.sber.ru/rest/v1/text:synthesize",
        text, // Отправляем просто текст
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/text", // Изменили тип контента
            Accept: "audio/x-pcm;bit=16;rate=24000",
            "X-Request-ID": uuidv4(),
            "X-Voice": voice, // Параметр голоса передаем через заголовок
          },
          responseType: "arraybuffer",
          httpsAgent,
        },
      );

      return Buffer.from(response.data);
    } catch (error) {
      if (error.response) {
        // Декодируем ответ об ошибке из буфера
        const errorMessage = Buffer.from(error.response.data).toString("utf8");
        console.error("Synthesis Error:", {
          status: error.response.status,
          message: errorMessage,
          headers: error.response.headers,
        });
      }
      throw error;
    }
  }

  async generateVoice(text: string, voice: string, speed: number = 1.0): Promise<Buffer> {
    try {
      console.log("=== SberService: Generating voice ===");
      console.log("Text:", text);
      console.log("Voice ID:", voice);
      console.log("Speed:", speed);

      const token = await this.getAccessToken();

      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      // Добавляем параметры для голоса в URL
      const response = await axios.post("https://smartspeech.sber.ru/rest/v1/text:synthesize", text, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/text",
          Accept: "audio/x-pcm;bit=16;rate=24000",
          "X-Request-ID": uuidv4(),
          "X-Voice": voice,
          "X-Rate": speed.toString(), // Добавляем параметр скорости речи
          "X-Format": "pcm",
          "X-Sample-Rate": "24000",
        },
        responseType: "arraybuffer",
        httpsAgent,
      });

      console.log("SberService: Voice generated successfully with voice:", voice, "and speed:", speed);
      return Buffer.from(response.data);
    } catch (error) {
      console.error("Error in generateVoice:", error);
      if (error.response) {
        console.error("Sber API Error Response:", {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data.toString(),
        });
      }
      throw error;
    }
  }
}
