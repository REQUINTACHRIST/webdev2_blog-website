"use trict";

var test = require("node:test");
var assert = require("node:assert/strict");
var helpers = require("./community-post");

function validPost() {
  return {
    title: "Sunday sinigang",
    author: "Kai",
    content: "We cooked together and shared a long lunch.",
    image: "https://example.com/sinigang.jpg"
  };
}

function issueFor(post) {
  var encoded = Buffer.from(JSON.stringify(post)).toString("base64");
  return {
    title: "Community post: " + post.title,
    body: "A food story.\n\n<!-- IANS_COOKING_POST_V1\n" + encoded + "\n-->"
  };
}

test("parses a community post from its GitHub issue", function () {
  assert.deepEqual(helpers.postFromIssue(issueFor(validPost())), validPost());
});

test("rejects malformed or repeated post payloads", function () {
  assert.throws(function () { helpers.parsePost("not a post"); }, /data is missing or invalid/);
  var body = issueFor(validPost()).body;
  assert.throws(function () { helpers.parsePost(body + "\n" + body); }, /data is missing or invalid/);
});

test("rejects unsafe images and issue titles that do not match the post", function () {
  var invalid = validPost();
  invalid.image = "javascript:alert(1)";
  assert.throws(function () { helpers.validatePost(invalid); }, /HTTPS URL/);
  var issue = issueFor(validPost());
  issue.title = "Community post: changed title";
  assert.throws(function () { helpers.postFromIssue(issue); }, /must match/);
});
