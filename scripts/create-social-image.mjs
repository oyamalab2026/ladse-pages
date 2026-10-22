import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
const media=JSON.parse(await readFile(new URL('../src/data/media.json',import.meta.url),'utf8'));
const image=await readFile(new URL('../public'+media['images/mars-airplane.jpg'],import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined)});
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(`<html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#102b3d;font-family:Arial,sans-serif}.canvas{display:grid;grid-template-columns:1fr 1fr;height:630px;padding:56px;gap:25px}.text{display:flex;flex-direction:column;justify-content:space-between}small{font-size:14px;color:#007f8b;letter-spacing:3px}h1{font-size:66px;font-family:Georgia,serif;font-weight:400;line-height:1.12;margin:30px 0}h2{font-size:36px;letter-spacing:-2px;margin:0}p{font-size:16px;line-height:1.8;color:#516674}img{width:100%;height:518px;object-fit:cover}.brand{border-top:1px solid #dce4e8;padding-top:20px;font-size:12px;letter-spacing:2px}</style></head><body><div class="canvas"><div class="text"><h2>Oyama Lab.</h2><div><small>AERODYNAMICS × DESIGN × SPACE</small><h1>Designing flight.<br>Beyond Earth.</h1><p>Laboratory of Aerodynamics and<br>Design in Space Engineering</p></div><div class="brand">JAXA / ISAS · SAGAMIHARA, JAPAN</div></div><img alt="Mars airplane concept" src="data:image/webp;base64,${image.toString('base64')}"></div></body></html>`);
 await page.locator('img').evaluate(img=>img.decode());
 await page.screenshot({path:new URL('../public/og-image.png',import.meta.url).pathname});
 console.log('Created public/og-image.png');
}finally{await browser.close();}
