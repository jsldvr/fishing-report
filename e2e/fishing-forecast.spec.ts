import { test, expect } from "@playwright/test";

test.describe("Fishing Forecast App", () => {
  test("should load the homepage with proper title and content", async ({
    page,
  }) => {
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/Fishing Forecast/);

    // Check main heading exists (be more specific to avoid multiple matches)
    await expect(
      page.getByRole("heading", { name: /🎣 Tactical Fishing Intel/i })
    ).toBeVisible();

    // Check for description text
    await expect(page.getByText(/Military-grade precision/i)).toBeVisible();
  });

  test("should display location input form on homepage", async ({ page }) => {
    await page.goto("/");

    // Check for location input elements - using actual placeholder text
    await expect(
      page.getByPlaceholder(/Oklahoma City, OK or 35.3383, -97.4867/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Recon/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).toBeVisible();
  });

  test("should show feature cards on homepage", async ({ page }) => {
    await page.goto("/");

    // Check for the three feature cards
    await expect(page.getByText(/Lunar Intel/i)).toBeVisible();
    await expect(page.getByText(/Weather Recon/i)).toBeVisible();
    await expect(page.getByText(/Tactical Analysis/i)).toBeVisible();
  });

  test("should navigate to forecast results page with location input", async ({
    page,
  }) => {
    await page.goto("/");

    // Fill in location using text input
    await page
      .getByPlaceholder(/Oklahoma City, OK or 35.3383, -97.4867/i)
      .fill("Miami, FL");
    await page.getByRole("button", { name: /Recon/i }).click();

    // Wait for geocoding to complete
    await page.waitForTimeout(3000);

    // Click the mission brief button
    await page.getByRole("button", { name: /Execute Mission Brief/i }).click();

    // Wait for navigation and check we're on results page
    await expect(page).toHaveURL(/\/results/);
  });

  test("should work with direct coordinate input", async ({ page }) => {
    await page.goto("/");

    // Fill in coordinates directly in the text field
    await page
      .getByPlaceholder(/Oklahoma City, OK or 35.3383, -97.4867/i)
      .fill("25.7617, -80.1918");
    await page.getByRole("button", { name: /Recon/i }).click();

    // Wait a moment for processing
    await page.waitForTimeout(2000);

    // Should be able to execute mission brief
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).not.toBeDisabled();
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check mobile layout works
    await expect(
      page.getByPlaceholder(/Oklahoma City, OK or 35.3383, -97.4867/i)
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).toBeVisible();

    // Check feature cards are still visible
    await expect(page.getByText(/Lunar Intel/i)).toBeVisible();
  });

  test("should have working mission brief functionality", async ({ page }) => {
    await page.goto("/");

    // Check that the mission brief button and form elements exist
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).toBeVisible();

    // Verify coordinate input fields are present
    const latInput = page.getByPlaceholder("40.7128");
    const lonInput = page.getByPlaceholder("-74.0060");

    await expect(latInput).toBeVisible();
    await expect(lonInput).toBeVisible();

    // Check that the button functions (may be enabled by default with valid initial coords)
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).toBeEnabled();
  });

  test("should handle manual coordinate inputs", async ({ page }) => {
    await page.goto("/");

    // Look for latitude and longitude input fields
    const latInput = page.getByPlaceholder("40.7128");
    const lonInput = page.getByPlaceholder("-74.0060");

    await expect(latInput).toBeVisible();
    await expect(lonInput).toBeVisible();

    // Clear and enter new coordinates
    await latInput.clear();
    await latInput.fill("25.7617");
    await lonInput.clear();
    await lonInput.fill("-80.1918");

    // Mission brief button should become enabled
    await page.waitForTimeout(1000);
    await expect(
      page.getByRole("button", { name: /Execute Mission Brief/i })
    ).not.toBeDisabled();
  });
});
