"use trict";

var RECIPE_MARKER = /<!-- IANS_COOKING_RECIPE_V1\s+([A-Za-z0-9+/]+={0,2})\s+-->/g;
var CATEGORIES = new Set(["Ulam", "Merienda", "Desserts", "Soups", "Rice Dishes", "Street Food"]);
var DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);

function parseSubmission(body) {
  if (typeof body !== "string" || body.length > 65000) {
    throw new Error("The issue body is missing or exceeds GitHub's size limit.");
  }
  var matches = Array.from(body.matchAll(RECIPE_MARKER));
  if (matches.length !== 1) {
    throw new Error("The recipe data block is missing or invalid. Please submit the recipe using the Ian's Kitchen form.");
  }
  var encoded = matches[0][1];
  if (encoded.length > 50000 || encoded.length % 4 !== 0) {
    throw new Error("The recipe data block is too large or malformed.");
  }
  var decoded = Buffer.from(encoded, "base64").toString("utf8");
  if (Buffer.from(decoded, "utf8").toString("base64") !== encoded) {
    throw new Error("The recipe data block is not valid base64.");
  }
  try {
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error("The recipe data block is not valid JSON.");
  }
}

function validateSubmission(value) {
  var errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Recipe data must be an object.");
  }
  function requiredText(name, maxLength) {
    if (typeof value[name] !== "string" || !value[name].trim() || value[name].length > maxLength) {
      errors.push(name + " must be a non-empty text value of at most " + maxLength + " characters.");
    }
  }
  requiredText("title", 100);
  requiredText("author", 60);
  requiredText("description", 400);
  requiredText("servings", 40);
  if (typeof value.image !== "string" || value.image.length > 2048) {
    errors.push("image must be an HTTPS image URL or an empty string.");
  } else if (value.image) {
    try {
      var image = new URL(value.image);
      if (image.protocol !== "https:" || image.username || image.password) errors.push("image must be an HTTPS image URL without embedded credentials.");
    } catch (error) {
      errors.push("image must be a valid HTTPS image URL.");
    }
  }
  if (!CATEGORIES.has(value.category)) errors.push("category must be one of the supported recipe categories.");
  if (!DIFFICULTIES.has(value.difficulty)) errors.push("difficulty must be Easy, Medium, or Hard.");
  ["prepTime", "cookTime"].forEach(function (name) {
    if (!Number.isInteger(value[name]) || value[name] < 0 || value[name] > 1440) {
      errors.push(name + " must be a whole number between 0 and 1440.");
    }
  });
  ["ingredients", "steps"].forEach(function (name) {
    var maxItems = name === "ingredients" ? 50 : 40;
    var maxLength = name === "ingredients" ? 180 : 500;
    if (!Array.isArray(value[name]) || value[name].length < 1 || value[name].length > maxItems ||
        value[name].some(function (item) { return typeof item !== "string" || !item.trim() || item.length > maxLength; })) {
      errors.push(name + " must contain between 1 and " + maxItems + " non-empty text entries.");
    }
  });
  if (typeof value.tips !== "string" || value.tips.length > 800) errors.push("tips must be text of at most 800 characters.");
  if (errors.length) throw new Error("Recipe validation failed: " + errors.join(" "));
  return value;
}

function slugify(title) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "") || "community-recipe";
}

function recipeFromIssue(issue) {
  var submission = validateSubmission(parseSubmission(issue.body));
  var id = slugify(submission.title);
  return {
    id: id,
    title: submission.title.trim(),
    category: submission.category,
    description: submission.description.trim(),
    background: "",
    image: submission.image.trim(),
    prepTime: submission.prepTime,
    cookTime: submission.cookTime,
    servings: submission.servings.trim(),
    difficulty: submission.difficulty,
    ingredients: submission.ingredients.map(function (item) { return item.trim(); }),
    steps: submission.steps.map(function (item) { return item.trim(); }),
    tips: submission.tips.trim(),
    author: submission.author.trim(),
    publishedAt: new Date().toISOString().slice(0, 10),
    popularity: 0,
    issueNumber: issue.number
  };
}

module.exports = {
  parseSubmission: parseSubmission,
  validateSubmission: validateSubmission,
  recipeFromIssue: recipeFromIssue,
  slugify: slugify
};
