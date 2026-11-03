import { expect, test, type Page } from "@playwright/test";

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}

const openStall = (page: Page, name: string) =>
  page.getByTestId("stall-list").getByRole("button", { name }).click();

async function writeReview(page: Page, text: string, stars: number) {
  await page.getByRole("radio", { name: new RegExp(`^${stars} 星`) }).click();
  await page.getByTestId("review-text").fill(text);
  await page.getByRole("button", { name: "发布点评" }).click();
  await expect(page.getByTestId("toast")).toContainText("已发布");
}

test("页面加载无报错，3D 画布、榜单和标注都在", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByTestId("top-dishes").locator("li")).toHaveCount(5);
  await expect(page.getByTestId("new-dishes").locator("li")).toHaveCount(6);
  await expect(page.getByTestId("stall-list").locator("li")).toHaveCount(12);
  await expect(page.getByTestId("legend")).toContainText("均为演示数据");
  await expect(page.getByTestId("top-dishes").locator("li").first()).toContainText(/辣/);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("档口详情按规则显示榜单", async ({ page }) => {
  await page.goto("");
  await openStall(page, "北京味道");
  await expect(page.getByTestId("top-list").locator("li")).toHaveCount(5);
  await expect(page.getByTestId("low-list").locator("li")).toHaveCount(5);

  await openStall(page, "粤式烧腊");
  await expect(page.getByTestId("top-list").locator("li")).toHaveCount(3);
  await expect(page.getByTestId("low-list").locator("li")).toHaveCount(3);

  await openStall(page, "新疆风味");
  await expect(page.getByTestId("top-list").locator("li")).toHaveCount(3);
  await expect(page.getByTestId("low-list").locator("li")).toHaveCount(2);

  await openStall(page, "闽南沙茶面");
  await expect(page.getByTestId("stall-drawer")).toContainText("暂无评分");
  await expect(page.getByTestId("top-list")).toHaveCount(0);
});

test("发表评论：评分更新，刷新后还在，可删除，可重置", async ({ page }) => {
  await page.goto("");
  await openStall(page, "闽南沙茶面");
  await expect(page.getByTestId("stall-score")).toHaveText("暂无评分");

  await writeReview(page, "沙茶汤底很香，推荐", 5);
  await expect(page.getByTestId("stall-score")).toHaveText("5.0");
  await expect(page.getByTestId("review-list")).toContainText("沙茶汤底很香");
  await expect(page.getByTestId("stall-list")).toContainText("★ 5.0");

  await page.reload();
  await openStall(page, "闽南沙茶面");
  await expect(page.getByTestId("stall-score")).toHaveText("5.0");

  await page.getByTestId("review-list").getByRole("button", { name: "删除" }).click();
  await expect(page.getByTestId("stall-score")).toHaveText("暂无评分");

  await writeReview(page, "再写一条用来测重置", 2);
  await expect(page.getByTestId("stall-score")).toHaveText("2.0");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "重置演示数据" }).click();
  await expect(page.getByTestId("stall-score")).toHaveText("暂无评分");
});

test("评论表单校验", async ({ page }) => {
  await page.goto("");
  await openStall(page, "北京味道");
  await page.getByRole("button", { name: "发布点评" }).click();
  await expect(page.getByRole("alert")).toHaveText("请先打分");
  await page.getByRole("radio", { name: /^4 星/ }).click();
  await page.getByTestId("review-text").fill("好吃");
  await page.getByRole("button", { name: "发布点评" }).click();
  await expect(page.getByRole("alert")).toContainText("至少");
});

test("点菜品的“评价”会预选这道菜，并滚到表单", async ({ page }) => {
  await page.goto("");
  await openStall(page, "北京味道");
  const first = page.getByTestId("top-list").locator("li").first();
  const name = (await first.locator(".board-title").innerText()).split(/\s/)[0];
  await first.getByRole("button", { name: `评价${name}` }).click();
  await expect(page.getByTestId("review-dish").locator("option:checked")).toContainText(name);
  await expect(page.getByTestId("review-form")).toBeInViewport();
  await page.waitForTimeout(900);
  await expect(page.getByTestId("review-form")).toBeInViewport();
});

test("转盘结果可以跳转到正确的档口", async ({ page }) => {
  await page.goto("");
  await page.getByTestId("open-wheel").click();
  const modal = page.getByTestId("wheel-modal");
  await expect(modal.locator("svg.wheel path")).toHaveCount(6);
  await page.getByTestId("wheel-spin").click();
  const result = page.getByTestId("wheel-result");
  await expect(result).toBeVisible({ timeout: 8000 });
  const stallId = await result.getAttribute("data-stall");
  const dishName = await result.locator(".wheel-dish").innerText();

  await result.getByRole("button", { name: "去这个档口" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId("stall-drawer")).toBeVisible();
  await expect(page.getByTestId("review-dish")).toBeVisible();
  expect(stallId).toBeTruthy();
  await expect(page.locator(".dish-item.is-focused")).toContainText(dishName);
});

test("转盘筛选“只要辣”只出现辣菜", async ({ page }) => {
  await page.goto("");
  await page.getByTestId("open-wheel").click();
  await page.getByRole("button", { name: "只要辣" }).click();
  const tags = page.locator(".sector-tag");
  await expect(async () => {
    const texts = await tags.allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) expect(text.startsWith("辣")).toBe(true);
  }).toPass();
});

test("点击 3D 里的档口可以打开详情，拖动不会", async ({ page }) => {
  await page.goto("");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(2500);
  const box = (await canvas.boundingBox())!;
  // 北京味道在后墙第 3 个位置，正好在画面中线左边一点
  const backRow = { x: box.x + box.width * 0.45, y: box.y + box.height * 0.33 };

  await page.mouse.move(backRow.x, backRow.y);
  await page.mouse.down();
  await page.mouse.move(backRow.x + 60, backRow.y + 10, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page.getByTestId("stall-drawer")).toHaveCount(0);
  await page.getByRole("button", { name: "回到全景" }).click();
  await page.waitForTimeout(2000);

  await page.mouse.click(backRow.x, backRow.y);
  await expect(page.getByTestId("stall-drawer")).toContainText("北京味道");
});

test("手机宽度没有横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(page.getByTestId("top-dishes").locator("li")).toHaveCount(5);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await openStall(page, "北京味道");
  await expect(page.getByTestId("stall-drawer")).toBeInViewport();
});

test("禁用 WebGL 时显示 2D 平面图，且可以打开档口", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith("webgl")) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto("");
  const plan = page.getByTestId("floor-plan");
  await expect(plan).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await plan.getByRole("button", { name: /北京味道/ }).click();
  await expect(page.getByTestId("stall-drawer")).toBeVisible();
});
