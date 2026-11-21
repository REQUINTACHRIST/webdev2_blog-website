"use strict";

var POST_MARKER = /<!-- IANS_COOKING_POST_V1\s+([A-Za-z0-9+/]+={0,2})\s+-->/g;

function parsePost(body) {
  if (typeof body !== "string" || body.length > 65000) {
    throw new Error("The post is missing or exceeds GitHub's issue size limit.");
  }
  var matches = Array.from(body.matchAll(POST_MARKER));
  if (matches.length !== 1) {
    throw new Error("The post data is missing or invalid. Please submit it using the community form.");
  }
  var encoded = matches[0][1];
  if (encoded.length > 12000 || encoded.length % 4 !== 0) {
    throw new Error("The post data is too large or malformed.");
  }
  var decoded = Buffer.from(encoded, "base64").toString("utf8");
  if (Buffer.from(decoded, "utf8").toString("base64") !== encoded) {
    throw new Error("The post data is not valid base64.");
  }
  try {
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error("The post data is not valid JSON.");
  }
}

function validatePost(post) {
  if (!post || typeof post !== "object" || Array.isArray(post)) {
    throw new Error("Post data must be an object.");
  }
  var errors = [];
  [
    ["title", 100],
    ["author", 60],
    ["content", 2000]
  ].forEach(function (field) {
    var name = field[0];
    var maxLength = field[1];
    if (typeof post[name] !== "string" || !post[name].trim() || post[name].length > maxLength) {
      errors.push(name + " must be non-empty text of at most " + maxLength + " characters.");
    }
  });
  if (typeof post.image !== "string" || post.image.length > 2048) {
    errors.push("image must be an HTTPS image URL or an empty string.");
  } else if (post.image) {
    try {
      var image = new URL(post.image);
      if (image.protocol !== "https:" || image.username || image.password) {
        errors.push("image must be an HTTPS URL without embedded credentials.");
      }
    } catch (error) {
      errors.push("image must be a valid HTTPS image URL.");
    }
  }
  if (errors.length) throw new Error("Post validation failed: " + errors.join(" "));
  return post;
}

function postFromIssue(issue) {
  var post = validatePost(parsePost(issue.body));
  if (issue.title !== "Community post: " + post.title.trim()) {
    throw new Error("The issue title must match the community post title.");
  }
  return post;
}

module.exports = {
  parsePost: parsePost,
  validatePost: validatePost,
  postFromIssue: postFromIssue
};
