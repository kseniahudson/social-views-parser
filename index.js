import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());
app.use(cors());

function detectPlatform(url) {
  if (url.includes("youtu")) return "youtube";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("vk.com")) return "vk";
  if (url.includes("t.me")) return "telegram";
  return "unknown";
}

async function extractViews(url) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    const platform = detectPlatform(url);
    let views = null;

    if (platform === "youtube") {
      try {
        views = await page.$eval("meta[itemprop='interactionCount']", el => el.content);
      } catch {
        views = "Не найдено";
      }
    }

    if (platform === "instagram") {
      try {
        await page.waitForSelector("meta[property='og:description']", { timeout: 5000 });
        const text = await page.$eval("meta[property='og:description']", el => el.content);
        const match = text.match(/(\d[\d,.]*) views/);
        views = match ? match[1].replace(/[,.]/g, "") : "Не найдено";
      } catch {
        views = "Не найдено";
      }
    }

    if (platform === "tiktok") {
      try {
        await page.waitForSelector("strong[data-e2e='video-views']", { timeout: 5000 });
        const text = await page.$eval("strong[data-e2e='video-views']", el => el.textContent);
        views = text.replace(/\D/g, "") || "Не найдено";
      } catch {
        views = "Не найдено";
      }
    }

    if (platform === "vk") {
      try {
        await page.waitForSelector(".like_views .like_button_count", { timeout: 5000 });
        const text = await page.$eval(".like_views .like_button_count", el => el.textContent);
        views = text.replace(/\D/g, "") || "Не найдено";
      } catch {
        views = "Не найдено";
      }
    }

    if (platform === "telegram") {
      try {
        await page.waitForSelector(".tgme_widget_message_views", { timeout: 5000 });
        const text = await page.$eval(".tgme_widget_message_views", el => el.textContent);
        views = text.replace(/\D/g, "") || "Не найдено";
      } catch {
        views = "Не найдено";
      }
    }

    await browser.close();
    return views;

  } catch (e) {
    await browser.close();
    return "Ошибка: " + e.message;
  }
}

app.post("/views", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ views: "Не указана ссылка" });

  const views = await extractViews(url);
  res.json({ views });
});

app.listen(3000, () => console.log("Сервер запущен на порту 3000"));
