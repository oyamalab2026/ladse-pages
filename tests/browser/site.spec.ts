import { test, expect } from '@playwright/test';

test('Japanese and English home pages and research detail navigation',async({page})=>{
 await page.goto('/ja/');
 await expect(page).toHaveTitle(/大山研究室/);
 await expect(page.getByRole('heading',{level:1})).toContainText('まだ見ぬ空に');
 await page.getByRole('link',{name:'Switch to English'}).click();
 await expect(page).toHaveURL(/\/en\/$/);
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.getByRole('link',{name:/Explore our research/}).click();
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
 for(const path of ['/ja/','/en/','/ja/people/','/ja/join/','/en/publications/','/ja/resources/']){
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
