import { test, expect } from '@playwright/test';

test('Japanese and English home pages and research detail navigation',async({page})=>{
 await page.goto('/ja/');
 await expect(page).toHaveTitle(/大山研究室/);
 await expect(page.getByRole('heading',{level:1})).toHaveText('大山研究室');
 await page.getByRole('link',{name:'Switch to English'}).click();
 await expect(page).toHaveURL(/\/en\/$/);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.locator('.hero-actions').getByRole('link',{name:'Research themes',exact:true}).click();
 await page.locator('.research-card').first().click();
 await expect(page).toHaveURL(/\/en\/research\/mars-aircraft\/$/);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Mars aircraft');
});
test('publication filters combine year, category and text; empty results recover',async({page})=>{
 await page.goto('/ja/publications/');
 await expect(page.locator('.publication:visible')).toHaveCount(40);
 await page.locator('#publication-year').selectOption('2025');
 await page.locator('#publication-category').selectOption('journal');
 const visible=page.locator('.publication:visible');
 expect(await visible.count()).toBeGreaterThan(0);
 for(const row of await visible.all()){await expect(row).toHaveAttribute('data-year','2025');await expect(row).toHaveAttribute('data-category','journal');}
 await page.locator('#publication-search').fill('no-such-publication-unique-test');
 await expect(page.locator('#publication-empty')).toBeVisible();
 await page.locator('#publication-search').fill('');
 await expect(page.locator('#publication-empty')).toBeHidden();
 await page.locator('#publication-search').press('Enter');
 await expect(page).toHaveURL(/\/ja\/publications\/$/);
 await expect(page.locator('#publication-year')).toHaveValue('2025');
});
test('mobile menu is keyboard accessible and pages do not overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 for(const path of ['/ja/','/en/','/ja/people/','/ja/join/','/en/publications/','/ja/resources/','/ja/news/','/ja/news/2026-08-03-000/']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
 await page.goto('/ja/');
 const toggle=page.getByRole('button',{name:'メニュー'});
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Escape');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(toggle).toBeFocused();
});
test('hero, member photographs and archived resources load',async({page})=>{
 for(const path of ['/ja/','/ja/people/','/ja/resources/','/ja/research/flow-control/']){
  await page.goto(path);
  const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>!(img as HTMLImageElement).complete||!(img as HTMLImageElement).naturalWidth).filter(img=>img.getAttribute('loading')!=='lazy').map(img=>img.getAttribute('src')));
  expect(broken).toEqual([]);
 }
 const response=await page.goto('/archive/benchmark/index.html');
 expect(response?.status()).toBe(200);
 await expect(page.getByText('旧サイトの記録 / Archived content')).toBeVisible();
});

test('news navigation, chronological list, categories and article links', async ({page}) => {
 await page.goto('/ja/');
 const navigation = page.locator('#main-nav');
 expect(await navigation.locator('a').evaluateAll(links => links.slice(0,4).map(link => link.getAttribute('href')))).toEqual(['/ja/research/','/ja/people/','/ja/news/','/ja/publications/']);
 await navigation.getByRole('link',{name:'ニュース',exact:true}).click();
 await expect(page).toHaveURL(/\/ja\/news\/$/);
 await expect(page.getByRole('heading',{level:1})).toHaveText('ニュース');
 await expect(navigation.getByRole('link',{name:'ニュース',exact:true})).toHaveAttribute('aria-current','page');
 const dates = await page.locator('.news-list time[datetime]').evaluateAll(elements => elements.map(element => element.getAttribute('datetime')!));
 expect(dates).toEqual([...dates].sort().reverse());
 for (const category of ['学会発表','受賞','研究室行事']) {
  await expect(page.locator('.news-category').filter({hasText:category}).first()).toBeVisible();
 }
 const firstArticle = page.locator('.news-row').first();
 const title = await firstArticle.locator('h3').innerText();
 await firstArticle.click();
 await expect(page.getByRole('heading',{level:1})).toHaveText(title);
 await expect(page.locator('.news-article-meta time')).toBeVisible();
 await page.getByRole('link',{name:'Switch to English'}).click();
 await expect(page).toHaveURL(/\/en\/news\/$/);
 await expect(page.getByRole('heading',{level:1})).toHaveText('News');
});

test('news summaries name presenters and imported articles render as prose', async ({page}) => {
 await page.goto('/ja/news/');
 const first = page.locator('a.news-row[href="/ja/news/2026-08-03-000/"]');
 await expect(first.locator('.news-summary')).toHaveText('倉田昇祈さん(M2)が発表しました．');
 const multiple = page.locator('a.news-row[href="/ja/news/2026-07-19-001/"]');
 await expect(multiple.locator('.news-summary')).toContainText('大西龍汰郎さん(D2)');
 await expect(multiple.locator('.news-summary')).toContainText('飯田悠生さん(M2)');
 await first.click();
 const prose = page.locator('.news-detail .prose');
 await expect(prose).toContainText('第36回アストロダイナミクスシンポジウムで倉田昇祈さん(M2)が発表しました');
 await expect(prose).toContainText('CubeSatクラス宇宙機');
 await expect(prose.locator('pre code')).toHaveCount(0);
 expect(await prose.innerText()).not.toMatch(/<\/?(?:div|p|article|br)\b/);
 await page.goto('/ja/news/2021-06-18-050/');
 await expect(page.locator('.news-detail .prose img')).toHaveAttribute('src','/archive/mabe2/fig3.jpg');
 await expect(page.locator('.news-detail .prose pre code')).toHaveCount(0);
});
