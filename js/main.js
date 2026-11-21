/(function () {
  "use strict";

  var recipes = [];
  var mealDbRecipes = [];
  var PAGE_SIZE = 9;
  var currentPage = 1;
  var categories = ["Ulam", "Merienda", "Desserts", "Soups", "Rice Dishes", "Street Food"];
  var POSTS_KEY = "ians-kitchen-community-posts";
  var RECIPE_COMMENTS_PREFIX = "ians-kitchen-recipe-comments:";
  var MEALDB_API = "https://www.themealdb.com/api/json/v1/1/";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function safeImage(url) {
    try {
      var parsed = new URL(url, window.location.href);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch (error) {
      return "";
    }
  }

  function readStorage(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function formatDate(date) {
    var parsed = date ? new Date(date) : null;
    return parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
      : "Recently";
  }

  function makeId(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function cardMarkup(recipe) {
    var image = safeImage(recipe.image);
    var time = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
    return '<article class="recipe-card">' +
      '<a class="card-image-wrap" href="recipes.html?recipe=' + encodeURIComponent(recipe.id) + '">' +
      (image ? '<img class="card-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(recipe.title) + '" loading="lazy">' : "") +
      '<span class="card-category">' + escapeHtml(recipe.category) + '</span></a>' +
      '<div class="card-content"><h3><a href="recipes.html?recipe=' + encodeURIComponent(recipe.id) + '">' + escapeHtml(recipe.title) + '</a></h3>' +
      '<p class="card-description">' + escapeHtml(recipe.description) + '</p>' +
      '<div class="card-meta"><span>◷ ' + time + ' min</span><span>✳ ' + escapeHtml(recipe.difficulty) + '</span></div>' +
      '<div class="card-footer"><a class="card-link" href="recipes.html?recipe=' + encodeURIComponent(recipe.id) + '">View recipe →</a>' +
      '<span class="card-author">By ' + escapeHtml(recipe.author || "Ian's Kitchen") + '</span></div></div></article>';
  }

  function mealDbCardMarkup(meal) {
    var image = safeImage(meal.strMealThumb);
    return '<article class="recipe-card"><div class="card-image-wrap">' +
      (image ? '<img class="card-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(meal.strMeal) + '" loading="lazy">' : "") +
      '<span class="card-category">Filipino</span></div><div class="card-content">' +
      '<h3>' + escapeHtml(meal.strMeal) + '</h3><p class="card-description">A Filipino recipe from TheMealDB.</p>' +
      '<div class="card-footer"><button class="card-link card-link-button" type="button" data-meal-id="' + escapeHtml(meal.idMeal) + '">View recipe →</button>' +
      '<span class="card-author">TheMealDB</span></div></div></article>';
  }

  function renderMealDbRecipes() {
    var grid = document.getElementById("mealdb-grid");
    var status = document.getElementById("mealdb-status");
    if (!grid || !status) return;
    var search = document.getElementById("mealdb-search");
    var query = search ? search.value.trim().toLowerCase() : "";
    var filtered = mealDbRecipes.filter(function (meal) {
      return meal.strMeal.toLowerCase().includes(query);
    });
    grid.innerHTML = filtered.map(mealDbCardMarkup).join("");
    status.textContent = filtered.length
      ? filtered.length + (filtered.length === 1 ? " recipe from TheMealDB" : " recipes from TheMealDB")
      : "No Filipino recipes match that search.";
  }

  async function loadMealDbRecipes() {
    var status = document.getElementById("mealdb-status");
    if (!status) return;
    try {
      var response = await fetch(MEALDB_API + "filter.php?a=Filipino", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("TheMealDB returned status " + response.status);
      var data = await response.json();
      mealDbRecipes = Array.isArray(data.meals) ? data.meals.filter(function (meal) {
        return meal && /^\d+$/.test(String(meal.idMeal)) && typeof meal.strMeal === "string" &&
          meal.strMeal.trim() && safeImage(meal.strMealThumb);
      }) : [];
      renderMealDbRecipes();
      if (!mealDbRecipes.length) status.textContent = "TheMealDB did not return Filipino recipes right now.";
    } catch (error) {
      status.textContent = "Filipino recipes from TheMealDB could not be loaded. Please try again later.";
    }
  }

  function mealDbDetailMarkup(meal) {
    var ingredients = [];
    for (var index = 1; index <= 20; index += 1) {
      var ingredient = String(meal["strIngredient" + index] || "").trim();
      var measure = String(meal["strMeasure" + index] || "").trim();
      if (ingredient) ingredients.push((measure ? measure + " " : "") + ingredient);
    }
    var steps = String(meal.strInstructions || "").split(/\r?\n/)
      .map(function (step) { return step.trim().replace(/^\d+[.)]\s*/, ""); })
      .filter(Boolean);
    var image = safeImage(meal.strMealThumb);
    var source = safeImage(meal.strSource);
    return '<a class="detail-back" href="#mealdb-recipes">← Back to Filipino recipes</a>' +
      '<div class="detail-top"><div>' + (image ? '<img class="detail-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(meal.strMeal) + '">' : "") + '</div>' +
      '<div class="detail-copy"><span class="eyebrow">' + escapeHtml(meal.strArea || "Filipino") + ' cuisine</span>' +
      '<h1>' + escapeHtml(meal.strMeal) + '</h1><p>Recipe details supplied by TheMealDB.</p>' +
      (source ? '<p class="detail-author">Original source: <a class="discussion-link" href="' + escapeHtml(source) + '" target="_blank" rel="noopener noreferrer">View source ↗</a></p>' : "") +
      '</div></div><div class="detail-columns"><section><h2>Ingredients</h2><ul class="ingredient-list">' +
      (ingredients.length ? ingredients.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") : "<li>Ingredients are not listed.</li>") +
      '</ul></section><section><h2>Cooking instructions</h2><ol class="steps-list">' +
      (steps.length ? steps.map(function (step) { return "<li>" + escapeHtml(step) + "</li>"; }).join("") : "<li>Instructions are not listed.</li>") +
      '</ol></section></div><p class="api-attribution">Recipe data and food photos: <a href="https://www.themealdb.com/" target="_blank" rel="noopener noreferrer">TheMealDB</a>.</p>';
  }

  async function showMealDbDetail(id) {
    var detail = document.getElementById("mealdb-detail");
    if (!detail) return;
    detail.hidden = false;
    detail.innerHTML = '<p class="loading-state">Loading recipe details…</p>';
    try {
      var response = await fetch(MEALDB_API + "lookup.php?i=" + encodeURIComponent(id), {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) throw new Error("TheMealDB returned status " + response.status);
      var data = await response.json();
      var meal = Array.isArray(data.meals) ? data.meals[0] : null;
      if (!meal || String(meal.idMeal) !== String(id)) throw new Error("Recipe details were not found.");
      detail.innerHTML = mealDbDetailMarkup(meal);
      document.getElementById("recipe-detail").hidden = true;
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      detail.innerHTML = '<a class="detail-back" href="#mealdb-recipes">← Back to Filipino recipes</a>' +
        '<p class="error-state">Recipe details could not be loaded. Please try again.</p>';
    }
  }

  function setupMealDb() {
    var grid = document.getElementById("mealdb-grid");
    if (!grid) return;
    document.getElementById("mealdb-search").addEventListener("input", renderMealDbRecipes);
    grid.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-meal-id]");
      if (button) showMealDbDetail(button.dataset.mealId);
    });
    loadMealDbRecipes();
  }

  function fillHomeLists() {
    document.querySelectorAll("[data-recipe-list]").forEach(function (container) {
      var list = recipes.slice();
      if (container.dataset.recipeList === "popular") {
        list.sort(function (a, b) { return Number(b.popularity || 0) - Number(a.popularity || 0); });
      } else {
        list.sort(function (a, b) { return String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")); });
      }
      list = list.slice(0, Number(container.dataset.limit) || 3);
      container.innerHTML = list.length ? list.map(cardMarkup).join("") : '<p class="empty-state">No recipes yet.</p>';
    });
  }

  function renderPagination(pageCount) {
    var nav = document.getElementById("pagination");
    if (!nav) return;
    nav.hidden = pageCount <= 1;
    nav.innerHTML = pageCount <= 1 ? "" : Array.from({ length: pageCount }, function (_, index) {
      var page = index + 1;
      return '<button type="button" data-page="' + page + '"' + (page === currentPage ? ' aria-current="page"' : "") + '>' + page + '</button>';
    }).join("");
  }

  function renderBrowse() {
    var grid = document.getElementById("recipes-grid");
    if (!grid) return;
    var query = (document.getElementById("recipe-search").value || "").trim().toLowerCase();
    var category = document.getElementById("category-filter").value;
    var sort = document.getElementById("recipe-sort").value;
    var filtered = recipes.filter(function (recipe) {
      var text = [recipe.title, recipe.description, recipe.category].concat(recipe.ingredients || []).join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!category || recipe.category === category);
    });
    filtered.sort(function (a, b) {
      return sort === "popular"
        ? Number(b.popularity || 0) - Number(a.popularity || 0)
        : String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
    });
    document.getElementById("recipe-count").textContent = filtered.length + (filtered.length === 1 ? " recipe" : " recipes");
    document.getElementById("empty-recipes").hidden = filtered.length > 0;
    var pageCount = Math.ceil(filtered.length / PAGE_SIZE);
    currentPage = Math.min(currentPage, Math.max(pageCount, 1));
    grid.innerHTML = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(cardMarkup).join("");
    renderPagination(pageCount);
  }

  function setupBrowse() {
    var grid = document.getElementById("recipes-grid");
    if (!grid) return;
    var params = new URLSearchParams(window.location.search);
    var search = document.getElementById("recipe-search");
    var category = document.getElementById("category-filter");
    var sort = document.getElementById("recipe-sort");
    search.value = params.get("q") || "";
    if (categories.includes(params.get("category"))) category.value = params.get("category");
    if (params.get("sort") === "popular") sort.value = "popular";
    [search, category, sort].forEach(function (control) {
      control.addEventListener(control === search ? "input" : "change", function () {
        currentPage = 1;
        renderBrowse();
      });
    });
    document.getElementById("pagination").addEventListener("click", function (event) {
      var button = event.target.closest("button[data-page]");
      if (!button) return;
      currentPage = Number(button.dataset.page);
      renderBrowse();
    });
    renderBrowse();
  }

  function commentsMarkup(comments) {
    if (!comments.length) return '<p class="comments-hint">No comments yet. Be the first to comment.</p>';
    return comments.map(function (comment) {
      return '<article class="comment-card"><div class="comment-meta"><strong>' + escapeHtml(comment.author) +
        '</strong><time>' + escapeHtml(formatDate(comment.createdAt)) + '</time></div>' +
        '<p class="comment-body">' + escapeHtml(comment.content) + '</p></article>';
    }).join("");
  }

  function detailMarkup(recipe) {
    var image = safeImage(recipe.image);
    var totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);
    var ingredients = (recipe.ingredients || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
    var steps = (recipe.steps || []).map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("");
    return '<a class="detail-back" href="recipes.html">← Back to all recipes</a>' +
      '<div class="detail-top"><div>' + (image ? '<img class="detail-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(recipe.title) + '">' : "") + '</div>' +
      '<div class="detail-copy"><span class="eyebrow">' + escapeHtml(recipe.category) + '</span><h1>' + escapeHtml(recipe.title) + '</h1>' +
      '<p>' + escapeHtml(recipe.description) + '</p><p>' + escapeHtml(recipe.background || "") + '</p>' +
      '<div class="detail-stats"><span class="detail-stat">Prep: ' + Number(recipe.prepTime || 0) + ' min</span><span class="detail-stat">Cook: ' + Number(recipe.cookTime || 0) + ' min</span><span class="detail-stat">Total: ' + totalTime + ' min</span><span class="detail-stat">' + escapeHtml(recipe.servings) + '</span></div></div></div>' +
      '<div class="detail-columns"><section><h2>Ingredients</h2><ul class="ingredient-list">' + ingredients + '</ul></section>' +
      '<section><h2>Steps</h2><ol class="steps-list">' + steps + '</ol></section></div>' +
      '<section class="comments-block" id="recipe-comments"><div class="comments-heading"><div><span class="eyebrow">Saved in this browser</span><h2>Comments</h2></div></div>' +
      '<div class="comments-list" id="recipe-comments-list"></div>' +
      '<form class="local-comment-form" id="recipe-comment-form"><label>Name<input name="author" maxlength="60" required></label>' +
      '<label>Comment<textarea name="content" maxlength="500" rows="3" required></textarea></label><button class="button button-green" type="submit">Add comment</button></form></section>';
  }

  function setupRecipeComments(recipe) {
    var key = RECIPE_COMMENTS_PREFIX + recipe.id;
    var list = document.getElementById("recipe-comments-list");
    var form = document.getElementById("recipe-comment-form");
    if (!list || !form) return;
    function render() {
      list.innerHTML = commentsMarkup(readStorage(key, []));
    }
    render();
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      var comments = readStorage(key, []);
      comments.unshift({
        id: makeId("comment"),
        author: String(data.get("author")).trim(),
        content: String(data.get("content")).trim(),
        createdAt: new Date().toISOString()
      });
      if (!writeStorage(key, comments)) {
        alert("Your browser could not save this comment.");
        return;
      }
      form.reset();
      render();
    });
  }

  function showRecipeDetail(id) {
    var section = document.getElementById("recipe-detail");
    if (!section || !id) return;
    var recipe = recipes.find(function (item) { return item.id === id; });
    if (!recipe) {
      section.hidden = false;
      section.innerHTML = '<p>We could not find that recipe. <a href="recipes.html">Browse all recipes</a>.</p>';
      return;
    }
    section.hidden = false;
    section.innerHTML = detailMarkup(recipe);
    document.querySelector(".browse-section").hidden = true;
    document.querySelector(".recipes-hero").hidden = true;
    setupRecipeComments(recipe);
  }

  function postCardMarkup(post) {
    var image = safeImage(post.image);
    var initial = Array.from(post.author.trim())[0] || "C";
    var postComments = Array.isArray(post.comments) ? post.comments : [];
    return '<article class="community-post-card" data-post-id="' + escapeHtml(post.id) + '">' +
      '<div class="post-card-meta"><span class="post-avatar">' + escapeHtml(initial.toUpperCase()) + '</span>' +
      '<span><strong>' + escapeHtml(post.author) + '</strong><time>' + escapeHtml(formatDate(post.createdAt)) + '</time></span></div>' +
      '<h3>' + escapeHtml(post.title) + '</h3><p class="post-card-content">' + escapeHtml(post.content) + '</p>' +
      (image ? '<img class="post-card-image" src="' + escapeHtml(image) + '" alt="Photo shared with ' + escapeHtml(post.title) + '">' : "") +
      '<details class="post-comments"><summary>' + postComments.length + (postComments.length === 1 ? " comment" : " comments") + '</summary>' +
      '<div class="post-comment-list">' + commentsMarkup(postComments) + '</div>' +
      '<form class="post-comment-form"><label>Name<input name="author" maxlength="60" required></label>' +
      '<label>Comment<textarea name="content" maxlength="500" rows="3" required></textarea></label>' +
      '<button class="button button-green" type="submit">Add comment</button></form></details></article>';
  }

  function loadCommunityPosts() {
    var grid = document.getElementById("community-post-list");
    var status = document.getElementById("post-feed-status");
    if (!grid || !status) return;
    var posts = readStorage(POSTS_KEY, []);
    posts.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    grid.innerHTML = posts.length ? posts.map(postCardMarkup).join("") : '<p class="empty-state">No posts yet. Share the first one above.</p>';
    status.textContent = posts.length ? posts.length + (posts.length === 1 ? " saved post" : " saved posts") : "Your posts are saved only in this browser.";

    grid.querySelectorAll(".community-post-card").forEach(function (card) {
      var postId = card.dataset.postId;
      var form = card.querySelector(".post-comment-form");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        var data = new FormData(form);
        var latest = readStorage(POSTS_KEY, []);
        var post = latest.find(function (item) { return item.id === postId; });
        if (!post) return;
        post.comments = post.comments || [];
        post.comments.unshift({
          id: makeId("comment"),
          author: String(data.get("author")).trim(),
          content: String(data.get("content")).trim(),
          createdAt: new Date().toISOString()
        });
        if (!writeStorage(POSTS_KEY, latest)) {
          alert("Your browser could not save this comment.");
          return;
        }
        loadCommunityPosts();
      });
    });
  }

  function setupCommunityPostForm() {
    var form = document.getElementById("community-post-form");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      var post = {
        id: makeId("post"),
        title: String(data.get("title")).trim(),
        author: String(data.get("author")).trim(),
        content: String(data.get("content")).trim(),
        image: String(data.get("image") || "").trim(),
        createdAt: new Date().toISOString(),
        comments: []
      };
      if (post.image) {
        post.image = safeImage(post.image);
        if (!post.image) {
          alert("Please use a valid HTTPS image URL.");
          return;
        }
      }
      var posts = readStorage(POSTS_KEY, []);
      posts.unshift(post);
      if (!writeStorage(POSTS_KEY, posts)) {
        alert("Your browser could not save this post.");
        return;
      }
      form.reset();
      loadCommunityPosts();
      document.getElementById("community-posts").scrollIntoView({ behavior: "smooth" });
    });
  }

  function setupMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
  }

  async function initialize() {
    setupMenu();
    try {
      var response = await fetch("data/recipes.json");
      if (!response.ok) throw new Error("Recipe data could not be loaded.");
      recipes = await response.json();
    } catch (error) {
      recipes = [];
    }
    fillHomeLists();
    if (document.getElementById("recipes-grid")) {
      setupBrowse();
      setupMealDb();
      var params = new URLSearchParams(window.location.search);
      if (params.get("recipe")) showRecipeDetail(params.get("recipe"));
    }
    if (document.getElementById("community-post-list")) {
      setupCommunityPostForm();
      loadCommunityPosts();
    }
  }

  initialize();
})();
