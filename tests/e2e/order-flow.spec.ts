import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_PASSWORD } from "../../playwright.config";

// A real 1×1 PNG, standing in for a screenshot of a bank-app receipt.
const RECEIPT = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const PHONE = "0803 123 4567";

async function signIn(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Ilham 🌸/ })).toBeVisible();
  return page;
}

async function placeOrder(page: Page, productName: string) {
  await page.goto("/shop");
  await page.getByRole("link", { name: productName, exact: true }).click();
  await page.locator("#order").getByRole("button", { name: "Order now" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel("Full name").fill("Amina Yusuf");
  await page.getByLabel("Phone number").fill(PHONE);
  await page.getByRole("button", { name: /Review order/ }).click();
  await expect(page.getByRole("heading", { name: "Review your order" })).toBeVisible();
}

test("the complete customer → owner → customer loop works on a phone", async ({ page, browser }) => {
  // 1–3. Browse on a phone and find Black Humrah at ₦2,500.
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Scents that feel like you." })).toBeVisible();
  await page.goto("/shop");
  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Black Humrah", exact: true }) });
  await expect(card).toContainText("₦2,500");
  await expect(card).toContainText("Available");

  // 4–7. Select it, enter details, pickup, review.
  await placeOrder(page, "Black Humrah");
  await expect(page.getByText("Total to pay")).toBeVisible();
  await expect(page.locator("main")).toContainText("₦2,500");

  // 8–9. Place the order and see exactly what to transfer, and where.
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Order placed — now complete your payment" })).toBeVisible();
  const payment = page.getByRole("region", { name: "Pay by bank transfer" });
  await expect(payment).toContainText("₦2,500");
  await expect(payment).toContainText("OPay");
  await expect(payment).toContainText("8089497031");
  const number = (await page.locator("h1").first().textContent())!.trim();
  expect(number).toMatch(/^SC-\d{4}$/);

  // 10–12. Upload the receipt and submit.
  await page.locator("#receipt").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: RECEIPT });
  await expect(page.getByAltText("Preview of your receipt")).toBeVisible();
  await page.getByRole("button", { name: "Submit receipt" }).click();
  await expect(page.getByRole("heading", { name: "Order received 🌸" })).toBeVisible();
  await expect(page.getByText("Payment under review").first()).toBeVisible();

  // 13–15. Track from a different phone with order number + phone number.
  const other = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
  await other.goto("/track");
  await other.getByLabel("Order number").fill(number.toLowerCase());
  await other.getByLabel("Phone number").fill("+2348031234567");
  await other.getByRole("button", { name: "Track Order" }).click();
  await expect(other.getByRole("heading", { name: number })).toBeVisible();
  await expect(other.getByText("Payment under review").first()).toBeVisible();

  // 16–18. Ilham signs in on her phone, sees the order and opens the receipt.
  const admin = await signIn(browser);
  await admin.getByRole("link", { name: "Review Payments" }).click();
  await admin.getByRole("link", { name: new RegExp(number) }).first().click();
  await expect(admin.getByRole("heading", { name: number })).toBeVisible();
  await expect(admin.getByAltText(`Payment receipt for ${number}`)).toBeVisible();
  await expect(admin.getByText("Payment under review").first()).toBeVisible();

  // Nothing moves forward before payment is confirmed.
  await expect(admin.getByText("Confirm the payment first")).toBeVisible();

  // 19–23. She checks OPay, confirms, and starts preparing.
  await admin.getByRole("button", { name: "Confirm Payment" }).click();
  await admin.getByRole("button", { name: "Yes, the money arrived" }).click();
  await expect(admin.getByText("Payment confirmed").first()).toBeVisible();
  await admin.getByRole("button", { name: "Start preparing" }).click();
  await expect(admin.getByText("Now: Processing")).toBeVisible();

  // 24–25. Ready for pickup, with a short update for the customer.
  await admin.getByRole("button", { name: "Mark ready for pickup" }).click();
  await expect(admin.getByText("Now: Ready for pickup")).toBeVisible();
  await admin.getByLabel("Message shown on the customer’s tracking page").fill("Your order is ready for pickup.");
  await admin.getByRole("button", { name: "Show to customer" }).click();
  await expect(admin.getByText("Saved — the customer sees it now.")).toBeVisible();

  // 26–27. The customer sees the update.
  await other.reload();
  await expect(other.getByRole("heading", { name: "Your order is ready for pickup 🎉" })).toBeVisible();
  await expect(other.getByRole("status").filter({ hasText: "Update from us" })).toContainText("Your order is ready for pickup.");
  await expect(other.getByText("Payment confirmed").first()).toBeVisible();
});

test("a product marked out of stock after the customer saw it can't be ordered", async ({ page, browser }) => {
  await placeOrder(page, "Kulacham");

  // Meanwhile, Ilham marks it out of stock from her phone.
  const admin = await signIn(browser);
  await admin.goto("/admin/products");
  await admin.getByRole("switch", { name: "Kulacham: available to order" }).first().click();
  await expect(admin.getByRole("switch", { name: "Kulacham: available to order" }).first()).toHaveAttribute("aria-checked", "false");
  await admin.waitForLoadState("networkidle");

  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByText("Kulacham is currently unavailable. Please choose another product.")).toBeVisible();

  // The shop shows it as unavailable, and the product page offers no order button.
  await page.goto("/products/kulacham");
  await expect(page.getByText("This product is currently unavailable.")).toBeVisible();
  await expect(page.locator("#order")).toHaveCount(0);

  // And back in stock again.
  await admin.getByRole("switch", { name: "Kulacham: available to order" }).first().click();
  await expect(admin.getByRole("switch", { name: "Kulacham: available to order" }).first()).toHaveAttribute("aria-checked", "true");
});

test("an order can't be opened with a guessed number or the wrong phone", async ({ page, browser }) => {
  await placeOrder(page, "White Humrah");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/SC-\d+/);
  const number = (await page.locator("h1").first().textContent())!.trim();

  const stranger = await (await browser.newContext()).newPage();
  await stranger.goto(`/orders/${number}`);
  await expect(stranger).toHaveURL(new RegExp(`/track\\?number=${number}`));
  await stranger.getByLabel("Phone number").fill("08099999999");
  await stranger.getByRole("button", { name: "Track Order" }).click();
  await expect(stranger.getByText("We couldn't find an order with that number and phone number")).toBeVisible();
  await expect(stranger.getByText("Amina")).toHaveCount(0);

  // Admin pages and receipts are closed to customers.
  const res = await stranger.request.get("/api/admin/orders/anything/receipt");
  expect(res.status()).toBe(401);
  await stranger.goto("/admin/orders");
  await expect(stranger).toHaveURL(/\/admin\/login/);
});
