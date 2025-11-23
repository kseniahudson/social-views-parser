import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json());

function detect(url) {
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
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

  let views = null;
  const platform = detect(url);

  // YOUTUBE
  if (platform === "youtube") {
    views = await page.$eval("meta[itemprop='interactionCount']", el => el.getAttribute("content"));
  }

  // INSTAGRAM
  if (platform === "instagram") {
    const elem = await page.$("meta[property='og:description']");
    if (elem) {
      const text = await page.evaluate(el => el.content, elem);
      const match = text.match(/(\d[\d,.]*) views/);
      views = match ? match[1].replace(/[,.]/g, "") : null;
    }
  }

  // TIKTOK
  if (platform === "tiktok") {
    const elem = await page.$("strong[data-e2e='video-views']");
    if (elem) {
      const text = await page.evaluate(el => el.textContent, elem);
      views = text.replace(/\D/g, "");
    }
  }

  // VK
  if (platform === "vk") {
    const elem = await page.$(".like_views .like_button_count");
    if (elem) {
      const text = await page.evaluate(el => el.textContent, elem);
      views = text.replace(/\D/g, "");
    }
  }

  // TELEGRAM
  if (platform === "telegram") {
    const elem = await page.$(".tgme_widget_message_views");
    if (elem) {
      const text = await page.evaluate(el => el.textContent, elem);
      views = text.replace(/\D/g, "");
    }
  }

  await browser.close();
  return views;
}

app.post("/views", async (req, res) => {
  try {
    const { url } = req.body;
    const views = await extractViews(url);
    res.json({ views });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server started"));
