# 🎨 Yaaazz Creative Co. — CMS User Guide

Welcome! This guide explains how to manage your products, categories, and site settings using **Decap CMS**.

## 🛍️ 1. Managing Products
Go to **`🛍️ Shop Settings — Products`** to add or edit items.

### Core Product Fields
*   **Title:** The display name of the product.
*   **URL Slug:** Lowercase with dashes (e.g., `morning-mercies`).
*   **Price / Sale Price:** Enter whole numbers (PHP). If Sale Price is used, the original is crossed out.
*   **Category:** Select the category (e.g., `devotional`). This determines which page it appears on.
*   **Stock Status:** 
    *   `In Stock`: Standard display.
    *   `Pre-Order`: Adds a badge and updates buttons.
    *   `Sold Out`: Automatically disables the \"Add to Cart\" button.

### 🔢 Mastering the \"Sort Order\"
The **Sort order** field is a number that tells the website which product comes first.
*   **Lower numbers appear first** (e.g., `0` is the start of the page).
*   **Recommended Strategy:** Use numbers like `10, 20, 30` instead of `1, 2, 3`. This way, if you want something to go *between* 10 and 20, you can just label it `15` without changing everything else.

---

## 🏷️ 2. Categories & Navigation
Your products belong to categories. These are managed in **`🏷️ Categories Builder`**.

*   **Display Name:** The name shown in menus.
*   **Icon:** Choose a decorative icon from the dropdown list.
*   **Landing Page:** If enabled, this category gets its own dedicated page (like `/devotionals/`).

> [!IMPORTANT]
> If you change a category's **Slug**, you must update all products assigned to that category to match the new slug, or they will disappear from that page!

---

## 🙏 3. Devotionals Page Features
Specific settings for the Devotionals page are in **`🙏 Devotionals Settings`**.

*   **Prompt of the Month:** You can set a manual \"Prompt of the Month\" title and quote. If left blank, the site rotates through the **Monthly Prompts** list automatically based on the current calendar month.
*   **Bundle Card:** You can change the text and link for the \"Bundle & Save\" card that stays fixed in the grid.

---

## ⚙️ 4. Global Site Settings
General settings like Social Links, Site Logo, and Header Navigation are in **`⚙️ General Settings`**.

*   **Navigation items:** You can reorder the top menu here. 
*   **Active ID:** To make a link highlight (underline) when you are on that page, the **Active ID** must exactly match the **URL Slug** of that page or category.

---

## 🛒 5. Payments & Shipping
*   **Cart Settings:** Upload your **GCash QR code** and set your **Flat shipping rate**.
*   **Shipping Settings:** Edit your delivery timelines and return policy points shown on the Checkout page.

---

## ✨ Pro Tips for Admins
1.  **Image Sizes:** Try to use images under 500KB for faster loading.
2.  **Saving:** Always click **Save** and then wait for the **Status Indicator** to show \"Published\" before checking your site.
3.  **Preview:** Most sections have a live preview on the right side of the editor to help you see how your text fits.
