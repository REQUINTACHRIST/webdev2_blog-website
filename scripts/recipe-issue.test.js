"use trict";

var test = require("node:test");
var assert = require("node:assert/strict");
var helpers = require("./recipe-issue");

function validRecipe() {
  return {
    title: "Lola's Adobo",
    author: "Kai",
    description: "A cozy family favorite.",
    image: "https://example.com/adobo.jpg",
    category: "Ulam",
    prepTime: 10,
    cookTime: 45,
    servings: "4 servings",
    difficulty: "Easy",
    ingredients: ["1 kg chicken"],
    steps: ["Simmer until tender."],
    tips: ""
  };
}

function issueFor(recipe) {
  var encoded = Buffer.from(JSON.stringify(recipe)).toString("base64");
  return { number: 42, body: "<!-- IANS_COOKING_RECIPE_V1\n" + encoded + "\n-->" };
}

test("parses and maps a well-formed submission to a recipe", function () {
  var result = helpers.recipeFromIssue(issueFor(validRecipe()));
  assert.equal(result.id, "lola-s-adobo");
  assert.equal(result.issueNumber, 42);
  assert.deepEqual(result.ingredients, ["1 kg chicken"]);
  assert.match(result.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("rejects malformed or repeated payload markers", function () {
  assert.throws(function () { helpers.parseSubmission("no payload here"); }, /data block is missing or invalid/);
  var block = issueFor(validRecipe()).body;
  assert.throws(function () { helpers.parseSubmission(block + "\n" + block); }, /data block is missing or invalid/);
});

test("rejects unsafe image protocols and invalid recipe fields", function () {
  var invalid = validRecipe();
  invalid.image = "javascript:alert(1)";
  invalid.cookTime = -1;
  invalid.steps = [];
  assert.throws(function () { helpers.validateSubmission(invalid); }, /HTTPS image URL/);
  assert.throws(function () { helpers.validateSubmission(invalid); }, /cookTime/);
  assert.throws(function () { helpers.validateSubmission(invalid); }, /steps/);
});

test("slugifies titles into URL-safe identifiers", function () {
  assert.equal(helpers.slugify("  Crème Brûlée & Ube! "), "creme-brulee-ube");
});
